import { authorizeBusinessAccess } from '@/lib/auth/business-access';
import { appointmentWhen } from '@/lib/email/appointment-time';
import { emailService } from '@/lib/email/email-service';
import { prisma } from '@/lib/prisma';
import {
  SlotTakenError,
  claimSlot,
  holdsSlot,
} from '@/lib/services/staff-schedule-lock';
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const updateBookingSchema = z
  .object({
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    notes: z.string().max(500).optional(),
    status: z.enum(['SCHEDULED', 'CONFIRMED', 'CANCELLED']).optional(),
  })
  .refine(body => Boolean(body.startTime) === Boolean(body.endTime), {
    message: 'startTime and endTime are changed together',
  })
  .refine(
    body =>
      !body.startTime ||
      !body.endTime ||
      new Date(body.startTime) < new Date(body.endTime),
    { message: 'endTime must be after startTime' }
  );

class AppointmentGoneError extends Error {}

/** What a client email about this appointment needs to say. */
const CLIENT_EMAIL_INCLUDE = {
  client: true,
  staff: { include: { user: { select: { name: true } } } },
  services: true,
  business: {
    select: {
      name: true,
      email: true,
      phone: true,
      address: true,
      timezone: true,
    },
  },
} satisfies Prisma.AppointmentInclude;

type AppointmentForEmail = Prisma.AppointmentGetPayload<{
  include: typeof CLIENT_EMAIL_INCLUDE;
}>;

/**
 * The email about this appointment, in the salon's time — or null when the
 * client has no email address to send it to.
 */
function clientEmail(appointment: AppointmentForEmail) {
  const { client, business, staff, services } = appointment;
  if (!client?.email) return null;
  return {
    customerName: `${client.firstName} ${client.lastName}`,
    customerEmail: client.email,
    businessName: business.name,
    serviceName: services.map(service => service.serviceName).join(', '),
    staffName: staff.displayName || staff.user.name || '',
    ...appointmentWhen(appointment, business.timezone),
    duration: services.reduce((total, service) => total + service.duration, 0),
    price: services.reduce(
      (total, service) => total + Number(service.price),
      0
    ),
    businessAddress: business.address || undefined,
    businessPhone: business.phone || undefined,
    businessEmail: business.email || undefined,
    appointmentId: appointment.id,
    notes: appointment.notes || undefined,
  };
}

const NOT_FOUND = () =>
  NextResponse.json({ error: 'Appointment not found' }, { status: 404 });

/**
 * The appointment, if the caller works for its business.
 *
 * This route takes an appointment id, not a businessId, and checked neither:
 * middleware proved the caller was signed in, and nothing proved they were
 * signed in *here*. Any user of any salon could read, reschedule or cancel
 * any other salon's appointment. A caller from another business gets the
 * same 404 as a missing id, so the route cannot be used to probe which ids
 * exist.
 */
async function authorizeAppointment(
  id: string
): Promise<
  { ok: true; businessId: string } | { ok: false; response: NextResponse }
> {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: { businessId: true },
  });
  if (!appointment) return { ok: false, response: NOT_FOUND() };

  const access = await authorizeBusinessAccess(appointment.businessId);
  if (!access.ok) {
    return {
      ok: false,
      response: access.response.status === 403 ? NOT_FOUND() : access.response,
    };
  }
  return { ok: true, businessId: access.businessId };
}

// Get booking details
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const bookingId = params.id;
    const access = await authorizeAppointment(bookingId);
    if (!access.ok) return access.response;

    const appointment = await prisma.appointment.findFirst({
      where: { id: bookingId, businessId: access.businessId },
      include: {
        client: true,
        staff: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        services: {
          include: {
            service: true,
          },
        },
        business: {
          select: {
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      appointment: {
        id: appointment.id,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        notes: appointment.notes,
        client: {
          firstName: appointment.client?.firstName,
          lastName: appointment.client?.lastName,
          email: appointment.client?.email,
          phone: appointment.client?.phone,
        },
        staff: {
          name: appointment.staff.displayName || appointment.staff.user.name,
        },
        service: {
          name: appointment.services[0].serviceName,
          price: appointment.services[0].price,
          duration: appointment.services[0].duration,
        },
        business: {
          name: appointment.business.name,
          email: appointment.business.email,
          phone: appointment.business.phone,
          address: appointment.business.address,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update booking (reschedule or modify)
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const bookingId = params.id;
    const access = await authorizeAppointment(bookingId);
    if (!access.ok) return access.response;

    const validation = updateBookingSchema.safeParse(await request.json());

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { startTime, endTime, notes, status } = validation.data;

    const updateData: Prisma.AppointmentUpdateInput = {};
    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);
    if (notes !== undefined) updateData.notes = notes;
    if (status) updateData.status = status;

    // A move, or reinstating a cancelled appointment, puts it into a slot.
    // The clash check and the write share a transaction under the staff
    // member's lock, so two of them cannot both take the same slot.
    const { previous, updatedAppointment } = await prisma.$transaction(
      async tx => {
        const current = await tx.appointment.findFirst({
          where: { id: bookingId, businessId: access.businessId },
          select: {
            staffId: true,
            startTime: true,
            endTime: true,
            status: true,
          },
        });
        // Authorized above; gone only if deleted in between.
        if (!current) throw new AppointmentGoneError();

        const moving = Boolean(startTime);
        const nextStatus = status ?? current.status;
        const reinstating = !holdsSlot(current.status) && holdsSlot(nextStatus);
        const holdsAfter = holdsSlot(nextStatus);
        if (holdsAfter && (moving || reinstating)) {
          const free = await claimSlot(tx, {
            businessId: access.businessId,
            staffId: current.staffId,
            startTime: startTime ? new Date(startTime) : current.startTime,
            endTime: endTime ? new Date(endTime) : current.endTime,
            excludeId: bookingId,
          });
          if (!free) throw new SlotTakenError();
        }

        return {
          previous: current,
          updatedAppointment: await tx.appointment.update({
            where: { id: bookingId },
            data: updateData,
            include: CLIENT_EMAIL_INCLUDE,
          }),
        };
      }
    );

    // Tell the client when their appointment is cancelled or moves. A
    // cancellation wins over a move sent in the same request.
    const cancelled =
      updatedAppointment.status === 'CANCELLED' &&
      previous.status !== 'CANCELLED';
    const moved =
      !cancelled &&
      previous.startTime.getTime() !== updatedAppointment.startTime.getTime();
    if (cancelled || moved) {
      const data = clientEmail(updatedAppointment);
      if (data) {
        const result = cancelled
          ? await emailService.sendAppointmentCancelled(data)
          : await emailService.sendAppointmentMoved(
              data,
              appointmentWhen(previous, updatedAppointment.business.timezone)
            );
        if (!result.success) {
          console.error('Change email not sent:', result.error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      appointment: {
        id: updatedAppointment.id,
        startTime: updatedAppointment.startTime,
        endTime: updatedAppointment.endTime,
        status: updatedAppointment.status,
        notes: updatedAppointment.notes,
        client: {
          firstName: updatedAppointment.client?.firstName,
          lastName: updatedAppointment.client?.lastName,
          email: updatedAppointment.client?.email,
        },
        staff: {
          name:
            updatedAppointment.staff.displayName ||
            updatedAppointment.staff.user.name,
        },
        service: {
          name: updatedAppointment.services[0].serviceName,
          price: updatedAppointment.services[0].price,
          duration: updatedAppointment.services[0].duration,
        },
        business: {
          name: updatedAppointment.business.name,
        },
      },
    });
  } catch (error) {
    if (error instanceof SlotTakenError) {
      return NextResponse.json(
        { error: 'Time slot is not available' },
        { status: 409 }
      );
    }
    if (error instanceof AppointmentGoneError) return NOT_FOUND();
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    );
  }
}

// Cancel booking
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const bookingId = params.id;
    const access = await authorizeAppointment(bookingId);
    if (!access.ok) return access.response;

    const appointment = await prisma.appointment.findFirst({
      where: { id: bookingId, businessId: access.businessId },
      include: CLIENT_EMAIL_INCLUDE,
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Update status to cancelled instead of deleting
    await prisma.appointment.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
    });

    // Cancelling twice tells the client once.
    const data =
      appointment.status === 'CANCELLED' ? null : clientEmail(appointment);
    if (data) {
      const result = await emailService.sendAppointmentCancelled(data);
      if (!result.success) {
        console.error('Cancellation email not sent:', result.error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return NextResponse.json(
      { error: 'Failed to cancel appointment' },
      { status: 500 }
    );
  }
}
