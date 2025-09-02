'use client';

/**
 * Payment Form Component
 * 
 * Secure payment form using Stripe Elements for PCI compliance
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/financial/employment-calculator';
import {
    CardElement,
    Elements,
    useElements,
    useStripe,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { AlertCircle, CheckCircle, CreditCard, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
    appointmentId: string;
    amount: number;
    description?: string;
    onSuccess?: (paymentIntent: any) => void;
    onError?: (error: string) => void;
}

interface PaymentFormInnerProps extends PaymentFormProps {
    clientSecret?: string;
}

const CARD_ELEMENT_OPTIONS = {
    style: {
        base: {
            fontSize: '16px',
            color: '#424770',
            '::placeholder': {
                color: '#aab7c4',
            },
            fontFamily: 'Inter, system-ui, sans-serif',
        },
        invalid: {
            color: '#9e2146',
        },
    },
    hidePostalCode: false,
};

/**
 * Inner payment form component that uses Stripe hooks
 */
function PaymentFormInner({
    appointmentId,
    amount,
    description,
    clientSecret,
    onSuccess,
    onError
}: PaymentFormInnerProps) {
    const stripe = useStripe();
    const elements = useElements();

    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'succeeded' | 'failed'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements || !clientSecret) {
            setErrorMessage('Payment system not ready. Please try again.');
            return;
        }

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
            setErrorMessage('Card information not found. Please refresh and try again.');
            return;
        }

        setIsProcessing(true);
        setPaymentStatus('processing');
        setErrorMessage('');

        try {
            // Confirm the payment with Stripe
            const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement,
                    billing_details: {
                        // You can add billing details here if needed
                    },
                },
            });

            if (error) {
                console.error('Payment confirmation error:', error);
                setErrorMessage(error.message || 'Payment failed. Please try again.');
                setPaymentStatus('failed');
                onError?.(error.message || 'Payment failed');
            } else if (paymentIntent.status === 'succeeded') {
                setPaymentStatus('succeeded');
                onSuccess?.(paymentIntent);
            } else {
                setErrorMessage('Payment was not completed. Please try again.');
                setPaymentStatus('failed');
                onError?.(paymentIntent.status);
            }
        } catch (error) {
            console.error('Payment processing error:', error);
            setErrorMessage('An unexpected error occurred. Please try again.');
            setPaymentStatus('failed');
            onError?.('An unexpected error occurred');
        } finally {
            setIsProcessing(false);
        }
    };

    if (paymentStatus === 'succeeded') {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardContent className="pt-6">
                    <div className="text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-green-700 mb-2">
                            Payment Successful!
                        </h3>
                        <p className="text-gray-600">
                            Your payment of {formatCurrency(amount)} has been processed successfully.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Details
                </CardTitle>
                <CardDescription>
                    {description || `Complete payment for appointment`}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Payment Amount Display */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Total Amount:</span>
                            <span className="text-lg font-bold text-gray-900">
                                {formatCurrency(amount)}
                            </span>
                        </div>
                    </div>

                    {/* Card Element */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            Card Information
                        </label>
                        <div className="border border-gray-300 rounded-md p-3 bg-white">
                            <CardElement options={CARD_ELEMENT_OPTIONS} />
                        </div>
                    </div>

                    {/* Error Message */}
                    {errorMessage && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                    )}

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        disabled={!stripe || isProcessing}
                        className="w-full"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing Payment...
                            </>
                        ) : (
                            <>
                                <CreditCard className="mr-2 h-4 w-4" />
                                Pay {formatCurrency(amount)}
                            </>
                        )}
                    </Button>

                    {/* Security Notice */}
                    <div className="text-xs text-gray-500 text-center">
                        <p>🔒 Your payment information is secure and encrypted.</p>
                        <p>Powered by Stripe</p>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

/**
 * Main payment form component with Stripe Elements provider
 */
export default function PaymentForm(props: PaymentFormProps) {
    const [clientSecret, setClientSecret] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        // Create payment intent when component mounts
        const createPaymentIntent = async () => {
            try {
                const response = await fetch('/api/payments', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        appointmentId: props.appointmentId,
                        amount: props.amount,
                        description: props.description,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to create payment intent');
                }

                const data = await response.json();
                setClientSecret(data.paymentIntent.clientSecret);
            } catch (error) {
                console.error('Error creating payment intent:', error);
                setError(error instanceof Error ? error.message : 'Failed to initialize payment');
                props.onError?.(error instanceof Error ? error.message : 'Failed to initialize payment');
            } finally {
                setIsLoading(false);
            }
        };

        createPaymentIntent();
    }, [props.appointmentId, props.amount, props.description, props.onError]);

    if (isLoading) {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardContent className="pt-6">
                    <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                        <p className="text-gray-600">Initializing payment...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardContent className="pt-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    const options = {
        clientSecret,
        appearance: {
            theme: 'stripe' as const,
            variables: {
                colorPrimary: '#FFD25A',
                colorBackground: '#ffffff',
                colorText: '#1f2937',
                colorDanger: '#ef4444',
                fontFamily: 'Inter, system-ui, sans-serif',
                spacingUnit: '4px',
                borderRadius: '6px',
            },
        },
    };

    return (
        <Elements stripe={stripePromise} options={options}>
            <PaymentFormInner {...props} clientSecret={clientSecret} />
        </Elements>
    );
}