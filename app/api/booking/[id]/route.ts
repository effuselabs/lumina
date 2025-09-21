import { emailService } from '@/lib/email/email-service';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const updateBookingSchema = z.object({
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'CANCELLED']).optional(),
});

// Get booking details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;

    const appointment = await prisma.appointment.findUnique({
      where: { id: bookingId },
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
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const body = await request.json();
    const validation = updateBookingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { startTime, endTime, notes, status } = validation.data;

    // Get current appointment
    const currentAppointment = await prisma.appointment.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        staff: true,
        services: true,
        business: true,
      },
    });

    if (!currentAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Check for conflicts if rescheduling
    if (startTime && endTime) {
      const conflictingAppointment = await prisma.appointment.findFirst({
        where: {
          id: { not: bookingId },
          staffId: currentAppointment.staffId,
          status: {
            in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'],
          },
          OR: [
            {
              AND: [
                { startTime: { lte: new Date(startTime) } },
                { endTime: { gt: new Date(startTime) } },
              ],
            },
            {
              AND: [
                { startTime: { lt: new Date(endTime) } },
                { endTime: { gte: new Date(endTime) } },
              ],
            },
            {
              AND: [
                { startTime: { gte: new Date(startTime) } },
                { endTime: { lte: new Date(endTime) } },
              ],
            },
          ],
        },
      });

      if (conflictingAppointment) {
        return NextResponse.json(
          { error: 'Time slot is not available' },
          { status: 409 }
        );
      }
    }

    // Update the appointment
    const updateData: any = {};
    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);
    if (notes !== undefined) updateData.notes = notes;
    if (status) updateData.status = status;

    const updatedAppointment = await prisma.appointment.update({
      where: { id: bookingId },
      data: updateData,
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
        services: true,
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

    // Send notification email for significant changes
    if (startTime || status === 'CANCELLED') {
      try {
        const _emailSubject = '';
        let emailType = '';

        if (status === 'CANCELLED') {
          const _emailSubject2 = 'Appointment Cancelled';
          emailType = 'cancellation';
        } else if (startTime) {
          const _emailSubject = 'Appointment Rescheduled';
          emailType = 'reschedule';
        }

        // For now, we'll use the same template but could create specific templates later
        if (updatedAppointment.client?.email && emailType) {
          const emailResult = await emailService.sendBookingConfirmation({
            customerName: `${updatedAppointment.client.firstName} ${updatedAppointment.client.lastName}`,
            customerEmail: updatedAppointment.client.email,
            businessName: updatedAppointment.business.name,
            serviceName: updatedAppointment.services[0].serviceName,
            staffName:
              updatedAppointment.staff.displayName ||
              updatedAppointment.staff.user.name ||
              '',
            appointmentDate: format(
              new Date(updatedAppointment.startTime),
              'EEEE, MMMM d, yyyy'
            ),
            appointmentTime: `${format(new Date(updatedAppointment.startTime), 'h:mm a')} - ${format(new Date(updatedAppointment.endTime), 'h:mm a')}`,
            duration: updatedAppointment.services[0].duration,
            price: Number(updatedAppointment.services[0].price),
            businessAddress: updatedAppointment.business.address || undefined,
            businessPhone: updatedAppointment.business.phone || undefined,
            businessEmail: updatedAppointment.business.email || undefined,
            appointmentId: updatedAppointment.id,
            notes: updatedAppointment.notes || undefined,
          });

          if (emailResult.success) {
            console.log(
              `${emailType} email sent successfully:`,
              emailResult.messageId
            );
          }
        }
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
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
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;

    // Get appointment details before cancellation
    const appointment = await prisma.appointment.findUnique({
      where: { id: bookingId },
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
        services: true,
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

    // Update status to cancelled instead of deleting
    const _cancelledAppointment = await prisma.appointment.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
    });

    // Send cancellation email
    if (appointment.client?.email) {
      try {
        // TODO: Create a specific cancellation email template
        console.log(
          'Appointment cancelled, should send cancellation email to:',
          appointment.client.email
        );
      } catch (emailError) {
        console.error('Error sending cancellation email:', emailError);
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
