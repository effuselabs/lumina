/**
 * Payment API Routes
 *
 * Handles payment intent creation, retrieval, and management
 */

import { auth } from '@/auth';
import { createTransaction } from '@/lib/financial/transaction-service';
import { prisma } from '@/lib/prisma';
import { createPaymentIntent, getPaymentIntent } from '@/lib/stripe';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schemas
const createPaymentSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().optional(),
});

// const getPaymentSchema = z.object({
//     paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
// });

/**
 * POST /api/payments
 * Creates a new payment intent for an appointment
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { appointmentId, amount, description } =
      createPaymentSchema.parse(body);

    // Get appointment details with business context
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
        staff: {
          select: {
            id: true,
            displayName: true,
            employmentType: true,
            commissionRate: true,
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        services: {
          select: {
            serviceName: true,
            price: true,
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

    // Verify user has access to this business
    const businessUser = await prisma.businessUser.findFirst({
      where: {
        businessId: appointment.businessId,
        userId: session.user.id,
      },
    });

    if (!businessUser) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Convert amount to cents for Stripe
    const amountInCents = Math.round(amount * 100);

    // Create Stripe payment intent
    const paymentIntent = await createPaymentIntent({
      amount: amountInCents,
      businessId: appointment.businessId,
      appointmentId: appointment.id,
      staffId: appointment.staffId,
      clientId: appointment.clientId || undefined,
      employmentType: appointment.staff.employmentType,
      commissionRate: appointment.staff.commissionRate?.toNumber(),
      description:
        description ||
        `Payment for appointment with ${appointment.staff.displayName}`,
    });

    // Create transaction record
    const transaction = await createTransaction({
      businessId: appointment.businessId,
      appointmentId: appointment.id,
      staffId: appointment.staffId,
      userId: session.user.id,
      type: 'PAYMENT',
      amount,
      paymentMethod: 'CARD',
      paymentId: paymentIntent.id,
      description:
        description ||
        `Payment for appointment with ${appointment.staff.displayName}`,
      staffEmploymentType: appointment.staff.employmentType,
      commissionRate: appointment.staff.commissionRate?.toNumber(),
      metadata: {
        services: appointment.services.map(s => ({
          name: s.serviceName,
          price: s.price.toNumber(),
        })),
        clientName: appointment.client
          ? `${appointment.client.firstName} ${appointment.client.lastName}`
          : appointment.clientName,
      },
    });

    return NextResponse.json({
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      },
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
      },
      appointment: {
        id: appointment.id,
        staffName: appointment.staff.displayName,
        services: appointment.services,
        clientName: appointment.client
          ? `${appointment.client.firstName} ${appointment.client.lastName}`
          : appointment.clientName,
      },
    });
  } catch (error) {
    console.error('Error creating payment:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments?paymentIntentId=pi_xxx
 * Retrieves payment intent details
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('paymentIntentId');

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      );
    }

    // Get payment intent from Stripe
    const paymentIntent = await getPaymentIntent(paymentIntentId);

    // Get transaction record
    const transaction = await prisma.transaction.findFirst({
      where: { paymentId: paymentIntentId },
      include: {
        appointment: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            clientName: true,
            services: {
              select: {
                serviceName: true,
                price: true,
              },
            },
          },
        },
        staff: {
          select: {
            id: true,
            displayName: true,
            employmentType: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this business
    const businessUser = await prisma.businessUser.findFirst({
      where: {
        businessId: transaction.businessId,
        userId: session.user.id,
      },
    });

    if (!businessUser) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        created: paymentIntent.created,
      },
      transaction: {
        id: transaction.id,
        amount: transaction.amount.toNumber(),
        status: transaction.status,
        createdAt: transaction.createdAt,
        commissionAmount: transaction.commissionAmount?.toNumber(),
      },
      appointment: transaction.appointment,
      staff: transaction.staff,
      business: transaction.business,
    });
  } catch (error) {
    console.error('Error retrieving payment:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve payment' },
      { status: 500 }
    );
  }
}
