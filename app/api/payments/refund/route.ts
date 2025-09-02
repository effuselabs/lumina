/**
 * Payment Refund API
 * 
 * Handles payment refunds with proper transaction logging
 */

import { auth } from '@/auth';
import { createRefundTransaction, getTransactionByPaymentId } from '@/lib/financial/transaction-service';
import { prisma } from '@/lib/prisma';
import { createRefund } from '@/lib/stripe';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const refundSchema = z.object({
    paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
    amount: z.number().positive('Refund amount must be positive').optional(),
    reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
    description: z.string().optional(),
});

/**
 * POST /api/payments/refund
 * Creates a refund for a payment
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { paymentIntentId, amount, reason, description } = refundSchema.parse(body);

        // Get the original transaction
        const originalTransaction = await getTransactionByPaymentId(paymentIntentId);

        if (!originalTransaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        // Verify user has access to this business
        const businessUser = await prisma.businessUser.findFirst({
            where: {
                businessId: originalTransaction.businessId,
                userId: session.user.id,
            },
        });

        if (!businessUser) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Check if transaction can be refunded
        if (originalTransaction.status !== 'COMPLETED') {
            return NextResponse.json(
                { error: 'Only completed transactions can be refunded' },
                { status: 400 }
            );
        }

        // Calculate refund amount (default to full refund)
        const refundAmount = amount || originalTransaction.amount;
        const refundAmountInCents = Math.round(refundAmount * 100);

        // Validate refund amount doesn't exceed original amount
        if (refundAmount > originalTransaction.amount) {
            return NextResponse.json(
                { error: 'Refund amount cannot exceed original payment amount' },
                { status: 400 }
            );
        }

        // Create Stripe refund
        const stripeRefund = await createRefund({
            paymentIntentId,
            amount: refundAmountInCents,
            reason,
            metadata: {
                businessId: originalTransaction.businessId,
                appointmentId: originalTransaction.appointmentId || '',
                staffId: originalTransaction.staffId || '',
                refundedBy: session.user.id,
            },
        });

        // Create refund transaction record
        const refundTransaction = await createRefundTransaction(
            originalTransaction.id,
            refundAmount,
            description || `Refund for payment ${paymentIntentId}`,
            {
                stripeRefundId: stripeRefund.id,
                stripePaymentIntentId: paymentIntentId,
                refundReason: reason,
                refundedBy: session.user.id,
                refundedAt: new Date().toISOString(),
            }
        );

        // Update refund transaction status to completed
        await prisma.transaction.update({
            where: { id: refundTransaction.id },
            data: {
                status: 'COMPLETED',
                paymentId: stripeRefund.id,
            },
        });

        // If this is a full refund, update the appointment status
        if (refundAmount === originalTransaction.amount && originalTransaction.appointmentId) {
            await prisma.appointment.update({
                where: { id: originalTransaction.appointmentId },
                data: { status: 'CANCELLED' },
            });
        }

        return NextResponse.json({
            refund: {
                id: stripeRefund.id,
                amount: stripeRefund.amount / 100, // Convert back to dollars
                currency: stripeRefund.currency,
                status: stripeRefund.status,
                reason: stripeRefund.reason,
            },
            transaction: {
                id: refundTransaction.id,
                amount: refundTransaction.amount,
                status: refundTransaction.status,
                type: refundTransaction.type,
            },
            originalTransaction: {
                id: originalTransaction.id,
                amount: originalTransaction.amount,
                appointmentId: originalTransaction.appointmentId,
            },
        });
    } catch (error) {
        console.error('Error creating refund:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create refund' },
            { status: 500 }
        );
    }
}