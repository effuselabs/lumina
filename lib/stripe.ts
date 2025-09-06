/**
 * Stripe Integration for Lumina
 *
 * Provides secure payment processing with multi-tenant support using Stripe Connect.
 * Handles payment intents, webhooks, and transaction logging.
 */

import Stripe from 'stripe';

let _stripe: Stripe | null = null;

// Lazy initialization of Stripe client
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }

    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      typescript: true,
    });
  }

  return _stripe;
}

// For backward compatibility
export const stripe = new Proxy({} as Stripe, {
  get(target, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});

// Stripe configuration constants
export const STRIPE_CONFIG = {
  currency: 'usd',
  automaticPaymentMethods: {
    enabled: true,
  },
  captureMethod: 'automatic' as const,
  confirmationMethod: 'automatic' as const,
} as const;

// Payment intent metadata keys
export const PAYMENT_METADATA_KEYS = {
  businessId: 'business_id',
  appointmentId: 'appointment_id',
  staffId: 'staff_id',
  clientId: 'client_id',
  employmentType: 'employment_type',
  commissionRate: 'commission_rate',
} as const;

/**
 * Creates a payment intent for an appointment
 */
export async function createPaymentIntent({
  amount,
  businessId,
  appointmentId,
  staffId,
  clientId,
  employmentType,
  commissionRate,
  description,
}: {
  amount: number; // Amount in cents
  businessId: string;
  appointmentId: string;
  staffId: string;
  clientId?: string;
  employmentType?: string;
  commissionRate?: number;
  description?: string;
}): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: STRIPE_CONFIG.currency,
      automatic_payment_methods: STRIPE_CONFIG.automaticPaymentMethods,
      capture_method: STRIPE_CONFIG.captureMethod,
      confirmation_method: STRIPE_CONFIG.confirmationMethod,
      description: description || `Payment for appointment ${appointmentId}`,
      metadata: {
        [PAYMENT_METADATA_KEYS.businessId]: businessId,
        [PAYMENT_METADATA_KEYS.appointmentId]: appointmentId,
        [PAYMENT_METADATA_KEYS.staffId]: staffId,
        ...(clientId && { [PAYMENT_METADATA_KEYS.clientId]: clientId }),
        ...(employmentType && {
          [PAYMENT_METADATA_KEYS.employmentType]: employmentType,
        }),
        ...(commissionRate && {
          [PAYMENT_METADATA_KEYS.commissionRate]: commissionRate.toString(),
        }),
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new Error('Failed to create payment intent');
  }
}

/**
 * Retrieves a payment intent by ID
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    throw new Error('Failed to retrieve payment intent');
  }
}

/**
 * Updates a payment intent
 */
export async function updatePaymentIntent(
  paymentIntentId: string,
  updates: Stripe.PaymentIntentUpdateParams
): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe.paymentIntents.update(paymentIntentId, updates);
  } catch (error) {
    console.error('Error updating payment intent:', error);
    throw new Error('Failed to update payment intent');
  }
}

/**
 * Cancels a payment intent
 */
export async function cancelPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe.paymentIntents.cancel(paymentIntentId);
  } catch (error) {
    console.error('Error canceling payment intent:', error);
    throw new Error('Failed to cancel payment intent');
  }
}

/**
 * Creates a refund for a payment
 */
export async function createRefund({
  paymentIntentId,
  amount,
  reason,
  metadata,
}: {
  paymentIntentId: string;
  amount?: number; // Amount in cents, if not provided, full refund
  reason?: Stripe.RefundCreateParams.Reason;
  metadata?: Record<string, string>;
}): Promise<Stripe.Refund> {
  try {
    return await stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(amount && { amount }),
      ...(reason && { reason }),
      ...(metadata && { metadata }),
    });
  } catch (error) {
    console.error('Error creating refund:', error);
    throw new Error('Failed to create refund');
  }
}

/**
 * Validates webhook signature
 */
export function validateWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error('Webhook signature validation failed:', error);
    throw new Error('Invalid webhook signature');
  }
}

/**
 * Extracts business context from Stripe event metadata
 */
export function extractBusinessContext(event: Stripe.Event): {
  businessId?: string;
  appointmentId?: string;
  staffId?: string;
  clientId?: string;
  employmentType?: string;
  commissionRate?: number;
} {
  const metadata = (event.data.object as any)?.metadata || {};

  return {
    businessId: metadata[PAYMENT_METADATA_KEYS.businessId],
    appointmentId: metadata[PAYMENT_METADATA_KEYS.appointmentId],
    staffId: metadata[PAYMENT_METADATA_KEYS.staffId],
    clientId: metadata[PAYMENT_METADATA_KEYS.clientId],
    employmentType: metadata[PAYMENT_METADATA_KEYS.employmentType],
    commissionRate: metadata[PAYMENT_METADATA_KEYS.commissionRate]
      ? parseFloat(metadata[PAYMENT_METADATA_KEYS.commissionRate])
      : undefined,
  };
}

/**
 * Formats amount from cents to dollars
 */
export function formatAmountFromCents(amountInCents: number): number {
  return amountInCents / 100;
}

/**
 * Formats amount from dollars to cents
 */
export function formatAmountToCents(amountInDollars: number): number {
  return Math.round(amountInDollars * 100);
}

/**
 * Gets payment method details from payment intent
 */
export function getPaymentMethodDetails(paymentIntent: Stripe.PaymentIntent): {
  type: string;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
} {
  const paymentMethod = paymentIntent.payment_method as Stripe.PaymentMethod;

  if (!paymentMethod) {
    return { type: 'unknown' };
  }

  if (paymentMethod.type === 'card' && paymentMethod.card) {
    return {
      type: 'card',
      last4: paymentMethod.card.last4,
      brand: paymentMethod.card.brand,
      expiryMonth: paymentMethod.card.exp_month,
      expiryYear: paymentMethod.card.exp_year,
    };
  }

  return { type: paymentMethod.type };
}
