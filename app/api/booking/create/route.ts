import { emailService } from '@/lib/email/email-service';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createBookingSchema = z.object({
  businessId: z.string(),
  serviceId: z.string(),
  staffId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  client: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = createBookingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid booking data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const {
      businessId,
      serviceId,
      staffId,
      startTime,
      endTime,
      client,
      notes,
    } = validation.data;

    // Verify business exists and is active
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        bookingEnabled: true,
        onlineBooking: true,
      },
    });

    if (!business || !business.bookingEnabled || !business.onlineBooking) {
      return NextResponse.json(
        { error: 'Online booking is not available for this business' },
        { status: 400 }
      );
    }

    // Verify service exists and is active
    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        businessId,
        isActive: true,
        isOnline: true,
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found or not available for online booking' },
        { status: 404 }
      );
    }

    // Verify staff exists and is available
    const staff = await prisma.staff.findFirst({
      where: {
        id: staffId,
        businessId,
        isActive: true,
        acceptsOnlineBookings: true,
        services: {
          some: {
            serviceId,
          },
        },
      },
    });

    if (!staff) {
      return NextResponse.json(
        { error: 'Staff member not found or not available' },
        { status: 404 }
      );
    }

    // Check for time slot conflicts
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        staffId,
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
        { error: 'Time slot is no longer available' },
        { status: 409 }
      );
    }

    // Create or find existing client
    let existingClient = await prisma.client.findFirst({
      where: {
        businessId,
        email: client.email,
      },
    });

    if (!existingClient) {
      existingClient = await prisma.client.create({
        data: {
          businessId,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
        },
      });
    }

    // Create the appointment
    const appointment = await prisma.appointment.create({
      data: {
        businessId,
        clientId: existingClient.id,
        staffId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: 'SCHEDULED',
        notes,
        totalDuration: service.duration,
        totalPrice: service.price,
        services: {
          create: {
            serviceId,
            serviceName: service.name,
            price: service.price,
            duration: service.duration,
          },
        },
      },
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

    // Send confirmation email
    try {
      const emailResult = await emailService.sendBookingConfirmation({
        customerName: `${appointment.client?.firstName} ${appointment.client?.lastName}`,
        customerEmail: appointment.client?.email || '',
        businessName: appointment.business.name,
        serviceName: appointment.services[0].serviceName,
        staffName:
          appointment.staff.displayName || appointment.staff.user.name || '',
        appointmentDate: format(
          new Date(appointment.startTime),
          'EEEE, MMMM d, yyyy'
        ),
        appointmentTime: `${format(new Date(appointment.startTime), 'h:mm a')} - ${format(new Date(appointment.endTime), 'h:mm a')}`,
        duration: appointment.services[0].duration,
        price: Number(appointment.services[0].price),
        businessAddress: appointment.business.address || undefined,
        businessPhone: appointment.business.phone || undefined,
        businessEmail: appointment.business.email || undefined,
        appointmentId: appointment.id,
        notes: appointment.notes || undefined,
      });

      if (!emailResult.success) {
        console.error('Failed to send confirmation email:', emailResult.error);
        // Don't fail the booking if email fails, just log it
      } else {
        console.log(
          'Confirmation email sent successfully:',
          emailResult.messageId
        );
        if (emailResult.previewUrl) {
          console.log('Email preview:', emailResult.previewUrl);
        }
      }
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Don't fail the booking if email fails
    }

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        client: {
          firstName: appointment.client?.firstName,
          lastName: appointment.client?.lastName,
          email: appointment.client?.email,
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
        },
      },
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
