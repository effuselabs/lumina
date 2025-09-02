/**
 * Cash Payment API
 * 
 * Handles cash payment processing and transaction logging
 */

import { auth } from '@/auth';
import { createTransaction } from '@/lib/financial/transaction-service';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const cashPaymentSchema = z.object({
    appointmentId: z.string().min(1, 'Appointment ID is required'),
    amount: z.number().positive('Amount must be positive'),
    tipAmount: z.number().min(0, 'Tip amount cannot be negative').optional().default(0),
    description: z.string().optional(),
});

/**
 * POST /api/payments/cash
 * Processes a cash payment for an appointment
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { appointmentId, amount, tipAmount, description } = cashPaymentSchema.parse(body);

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
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
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

        // Calculate service amount (excluding tip)
        const serviceAmount = amount - tipAmount;

        // Create main payment transaction
        const paymentTransaction = await createTransaction({
            businessId: appointment.businessId,
            appointmentId: appointment.id,
            staffId: appointment.staffId,
            userId: session.user.id,
            type: 'PAYMENT',
            amount: serviceAmount,
            paymentMethod: 'CASH',
            description: description || `Cash payment for appointment with ${appointment.staff.displayName}`,
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
                paymentMethod: 'cash',
                tipAmount,
            },
        });

        // Update transaction status to completed immediately for cash payments
        const completedTransaction = await prisma.transaction.update({
            where: { id: paymentTransaction.id },
            data: {
                status: 'COMPLETED',
                metadata: JSON.stringify({
                    ...JSON.parse(paymentTransaction.metadata as string || '{}'),
                    completedAt: new Date().toISOString(),
                    processedBy: session.user.id,
                }),
            },
        });

        // Create tip transaction if tip amount > 0
        let tipTransaction = null;
        if (tipAmount > 0) {
            tipTransaction = await createTransaction({
                businessId: appointment.businessId,
                appointmentId: appointment.id,
                staffId: appointment.staffId,
                userId: session.user.id,
                type: 'TIP',
                amount: tipAmount,
                paymentMethod: 'CASH',
                description: `Cash tip for ${appointment.staff.displayName}`,
                metadata: {
                    originalTransactionId: paymentTransaction.id,
                    paymentMethod: 'cash',
                },
            });

            // Mark tip transaction as completed
            await prisma.transaction.update({
                where: { id: tipTransaction.id },
                data: {
                    status: 'COMPLETED',
                    metadata: JSON.stringify({
                        ...JSON.parse(tipTransaction.metadata as string || '{}'),
                        completedAt: new Date().toISOString(),
                        processedBy: session.user.id,
                    }),
                },
            });
        }

        // Create commission transaction if applicable
        let commissionTransaction = null;
        if (paymentTransaction.commissionAmount && paymentTransaction.commissionAmount > 0) {
            commissionTransaction = await createTransaction({
                businessId: appointment.businessId,
                appointmentId: appointment.id,
                staffId: appointment.staffId,
                type: 'COMMISSION',
                amount: paymentTransaction.commissionAmount,
                description: `Commission for cash payment`,
                staffEmploymentType: appointment.staff.employmentType,
                commissionRate: appointment.staff.commissionRate?.toNumber(),
                metadata: {
                    originalTransactionId: paymentTransaction.id,
                    paymentMethod: 'cash',
                },
            });

            // Mark commission transaction as completed
            await prisma.transaction.update({
                where: { id: commissionTransaction.id },
                data: { status: 'COMPLETED' },
            });
        }

        // Update appointment status to completed
        await prisma.appointment.update({
            where: { id: appointmentId },
            data: { status: 'COMPLETED' },
        });

        return NextResponse.json({
            payment: {
                id: completedTransaction.id,
                amount: completedTransaction.amount,
                status: completedTransaction.status,
                paymentMethod: 'CASH',
                tipAmount,
                totalAmount: amount,
            },
            tip: tipTransaction ? {
                id: tipTransaction.id,
                amount: tipTransaction.amount,
                status: 'COMPLETED',
            } : null,
            commission: commissionTransaction ? {
                id: commissionTransaction.id,
                amount: commissionTransaction.amount,
                status: 'COMPLETED',
            } : null,
            appointment: {
                id: appointment.id,
                status: 'COMPLETED',
                staffName: appointment.staff.displayName,
                services: appointment.services,
                clientName: appointment.client
                    ? `${appointment.client.firstName} ${appointment.client.lastName}`
                    : appointment.clientName,
            },
            receipt: {
                transactionId: completedTransaction.id,
                businessName: appointment.business.name,
                date: new Date().toISOString(),
                services: appointment.services.map(s => ({
                    name: s.serviceName,
                    price: s.price.toNumber(),
                })),
                subtotal: serviceAmount,
                tip: tipAmount,
                total: amount,
                paymentMethod: 'Cash',
                staff: appointment.staff.displayName,
            },
        });
    } catch (error) {
        console.error('Error processing cash payment:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to process cash payment' },
            { status: 500 }
        );
    }
}