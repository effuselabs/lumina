/**
 * Stripe Webhook Handler
 * 
 * Processes Stripe webhook events for real-time payment status updates
 */

import { getTransactionByPaymentId, updateTransactionStatus } from '@/lib/financial/transaction-service';
import { prisma } from '@/lib/prisma';
import { extractBusinessContext, validateWebhookSignature } from '@/lib/stripe';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;



/**
 * POST /api/payments/webhook
 * Handles Stripe webhook events
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const signature = headers().get('stripe-signature');

        if (!signature) {
            console.error('Missing Stripe signature');
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
        }

        // Validate webhook signature
        const event = validateWebhookSignature(body, signature, WEBHOOK_SECRET);

        console.log(`Processing Stripe webhook: ${event.type}`);

        // Handle different event types
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentSucceeded(event);
                break;

            case 'payment_intent.payment_failed':
                await handlePaymentFailed(event);
                break;

            case 'payment_intent.canceled':
                await handlePaymentCanceled(event);
                break;

            case 'payment_intent.requires_action':
                await handlePaymentRequiresAction(event);
                break;

            case 'charge.dispute.created':
                await handleChargeDispute(event);
                break;

            case 'invoice.payment_succeeded':
                // Handle subscription payments if needed in the future
                console.log('Invoice payment succeeded:', event.data.object.id);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json(
            { error: 'Webhook handler failed' },
            { status: 400 }
        );
    }
}

/**
 * Handles successful payment events
 */
async function handlePaymentSucceeded(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const businessContext = extractBusinessContext(event);

    console.log(`Payment succeeded: ${paymentIntent.id}`);

    try {
        // Update transaction status
        const transaction = await getTransactionByPaymentId(paymentIntent.id);

        if (!transaction) {
            console.error(`Transaction not found for payment intent: ${paymentIntent.id}`);
            return;
        }

        await updateTransactionStatus(transaction.id, 'COMPLETED', {
            stripePaymentIntentId: paymentIntent.id,
            stripeChargeId: paymentIntent.latest_charge,
            paymentMethod: paymentIntent.payment_method,
            amountReceived: paymentIntent.amount_received,
            processingFee: paymentIntent.application_fee_amount || 0,
            completedAt: new Date(paymentIntent.created * 1000).toISOString(),
        });

        // Update appointment status to completed
        if (businessContext.appointmentId) {
            await prisma.appointment.update({
                where: { id: businessContext.appointmentId },
                data: { status: 'COMPLETED' },
            });
        }

        // Create commission transaction if applicable
        if (transaction.commissionAmount && transaction.commissionAmount > 0) {
            await prisma.transaction.create({
                data: {
                    businessId: transaction.businessId,
                    appointmentId: transaction.appointmentId,
                    staffId: transaction.staffId,
                    type: 'COMMISSION',
                    status: 'COMPLETED',
                    amount: transaction.commissionAmount,
                    currency: transaction.currency,
                    description: `Commission for payment ${paymentIntent.id}`,
                    staffEmploymentType: transaction.staffEmploymentType,
                    commissionRate: transaction.commissionRate,
                    metadata: JSON.stringify({
                        originalTransactionId: transaction.id,
                        originalPaymentIntentId: paymentIntent.id,
                    }),
                },
            });
        }

        console.log(`Successfully processed payment: ${paymentIntent.id}`);
    } catch (error) {
        console.error(`Error processing payment success: ${paymentIntent.id}`, error);
    }
}

/**
 * Handles failed payment events
 */
async function handlePaymentFailed(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    console.log(`Payment failed: ${paymentIntent.id}`);

    try {
        const transaction = await getTransactionByPaymentId(paymentIntent.id);

        if (!transaction) {
            console.error(`Transaction not found for payment intent: ${paymentIntent.id}`);
            return;
        }

        await updateTransactionStatus(transaction.id, 'FAILED', {
            stripePaymentIntentId: paymentIntent.id,
            failureCode: paymentIntent.last_payment_error?.code,
            failureMessage: paymentIntent.last_payment_error?.message,
            failedAt: new Date().toISOString(),
        });

        console.log(`Successfully processed payment failure: ${paymentIntent.id}`);
    } catch (error) {
        console.error(`Error processing payment failure: ${paymentIntent.id}`, error);
    }
}

/**
 * Handles canceled payment events
 */
async function handlePaymentCanceled(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    console.log(`Payment canceled: ${paymentIntent.id}`);

    try {
        const transaction = await getTransactionByPaymentId(paymentIntent.id);

        if (!transaction) {
            console.error(`Transaction not found for payment intent: ${paymentIntent.id}`);
            return;
        }

        await updateTransactionStatus(transaction.id, 'CANCELLED', {
            stripePaymentIntentId: paymentIntent.id,
            canceledAt: new Date().toISOString(),
            cancellationReason: paymentIntent.cancellation_reason,
        });

        console.log(`Successfully processed payment cancellation: ${paymentIntent.id}`);
    } catch (error) {
        console.error(`Error processing payment cancellation: ${paymentIntent.id}`, error);
    }
}

/**
 * Handles payment requiring action events
 */
async function handlePaymentRequiresAction(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    console.log(`Payment requires action: ${paymentIntent.id}`);

    try {
        const transaction = await getTransactionByPaymentId(paymentIntent.id);

        if (!transaction) {
            console.error(`Transaction not found for payment intent: ${paymentIntent.id}`);
            return;
        }

        await updateTransactionStatus(transaction.id, 'PROCESSING', {
            stripePaymentIntentId: paymentIntent.id,
            requiresAction: true,
            nextAction: paymentIntent.next_action?.type,
            updatedAt: new Date().toISOString(),
        });

        console.log(`Successfully processed payment requires action: ${paymentIntent.id}`);
    } catch (error) {
        console.error(`Error processing payment requires action: ${paymentIntent.id}`, error);
    }
}

/**
 * Handles charge dispute events
 */
async function handleChargeDispute(event: Stripe.Event) {
    const dispute = event.data.object as Stripe.Dispute;

    console.log(`Charge dispute created: ${dispute.id} for charge: ${dispute.charge}`);

    try {
        // Find transaction by charge ID
        const transaction = await prisma.transaction.findFirst({
            where: {
                metadata: {
                    path: ['stripeChargeId'],
                    equals: dispute.charge as string,
                },
            },
        });

        if (!transaction) {
            console.error(`Transaction not found for charge: ${dispute.charge}`);
            return;
        }

        // Create a dispute record (you might want to add a disputes table)
        await updateTransactionStatus(transaction.id, 'PROCESSING', {
            disputeId: dispute.id,
            disputeReason: dispute.reason,
            disputeAmount: dispute.amount,
            disputeStatus: dispute.status,
            disputeCreatedAt: new Date(dispute.created * 1000).toISOString(),
        });

        console.log(`Successfully processed charge dispute: ${dispute.id}`);
    } catch (error) {
        console.error(`Error processing charge dispute: ${dispute.id}`, error);
    }
}

// Disable body parsing for webhooks
export const runtime = 'nodejs';
export const preferredRegion = 'auto';