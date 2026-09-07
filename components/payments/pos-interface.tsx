'use client';

/**
 * Point of Sale (POS) Interface Component
 *
 * Provides a checkout workflow for staff to process payments
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/financial/employment-calculator';
import { format } from 'date-fns';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Loader2,
  Receipt,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import PaymentForm from './payment-form';

interface Service {
  id: string;
  serviceName: string;
  price: number;
  duration: number;
}

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  services: Service[];
  staff: {
    id: string;
    displayName: string;
    employmentType: string;
    commissionRate?: number;
  };
  status: string;
}

interface POSInterfaceProps {
  appointmentId: string;
  onPaymentComplete?: (paymentData: any) => void;
  onCancel?: () => void;
}

const PAYMENT_METHODS = [
  { value: 'card', label: 'Credit/Debit Card', icon: CreditCard },
  { value: 'cash', label: 'Cash', icon: DollarSign },
];

export default function POSInterface({
  appointmentId,
  onPaymentComplete,
  onCancel,
}: POSInterfaceProps) {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('card');
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  // Predefined tip percentages
  const TIP_PERCENTAGES = [15, 18, 20, 25];

  useEffect(() => {
    fetchAppointment();
  }, [appointmentId]);

  const fetchAppointment = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch appointment');
      }

      const data = await response.json();
      setAppointment(data);
    } catch (error) {
      console.error('Error fetching appointment:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to fetch appointment'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSubtotal = () => {
    if (!appointment) return 0;
    return appointment.services.reduce(
      (sum, service) => sum + service.price,
      0
    );
  };

  const calculateTotal = () => {
    return calculateSubtotal() + tipAmount;
  };

  const calculateCommission = () => {
    if (!appointment?.staff.commissionRate) return 0;
    const subtotal = calculateSubtotal();
    return (subtotal * appointment.staff.commissionRate) / 100;
  };

  const handleTipPercentage = (percentage: number) => {
    const subtotal = calculateSubtotal();
    const tip = (subtotal * percentage) / 100;
    setTipAmount(tip);
    setCustomTip('');
  };

  const handleCustomTip = (value: string) => {
    setCustomTip(value);
    const tip = parseFloat(value) || 0;
    setTipAmount(tip);
  };

  const handleCashPayment = async () => {
    setIsProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/payments/cash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId,
          amount: calculateTotal(),
          tipAmount,
          paymentMethod: 'cash',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process cash payment');
      }

      const data = await response.json();
      setPaymentComplete(true);
      onPaymentComplete?.(data);
    } catch (error) {
      console.error('Error processing cash payment:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to process payment'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardPaymentSuccess = (paymentData: any) => {
    setPaymentComplete(true);
    onPaymentComplete?.(paymentData);
  };

  const handleCardPaymentError = (error: string) => {
    setError(error);
  };

  if (isLoading) {
    return (
      <Card className="mx-auto w-full max-w-2xl">
        <CardContent className="pt-6">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
            <p className="text-gray-600">Loading appointment details...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !appointment) {
    return (
      <Card className="mx-auto w-full max-w-2xl">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (paymentComplete) {
    return (
      <Card className="mx-auto w-full max-w-2xl">
        <CardContent className="pt-6">
          <div className="text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <h3 className="mb-2 text-lg font-semibold text-green-700">
              Payment Completed!
            </h3>
            <p className="mb-4 text-gray-600">
              Payment of {formatCurrency(calculateTotal())} has been processed
              successfully.
            </p>
            <Button onClick={() => window.print()} variant="outline">
              <Receipt className="mr-2 h-4 w-4" />
              Print Receipt
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!appointment) {
    return (
      <Card className="mx-auto w-full max-w-2xl">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Appointment not found</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const subtotal = calculateSubtotal();
  const total = calculateTotal();
  const commission = calculateCommission();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Appointment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Checkout - {appointment.clientName || 'Walk-in Client'}
          </CardTitle>
          <CardDescription>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {format(new Date(appointment.startTime), 'MMM dd, yyyy HH:mm')}
              </span>
              <span>Staff: {appointment.staff.displayName}</span>
              <Badge variant="outline">
                {appointment.staff.employmentType}
              </Badge>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {appointment.services.map((service, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{service.serviceName}</p>
                  <p className="text-sm text-gray-500">
                    {service.duration} minutes
                  </p>
                </div>
                <span className="font-medium">
                  {formatCurrency(service.price)}
                </span>
              </div>
            ))}

            <Separator />

            <div className="flex items-center justify-between font-medium">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            {commission > 0 && (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Commission ({appointment.staff.commissionRate}%)</span>
                <span>{formatCurrency(commission)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tip Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Add Tip (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {TIP_PERCENTAGES.map(percentage => (
                <Button
                  key={percentage}
                  variant={
                    tipAmount === (subtotal * percentage) / 100
                      ? 'primary'
                      : 'outline'
                  }
                  onClick={() => handleTipPercentage(percentage)}
                  className="h-12"
                >
                  {percentage}%
                  <br />
                  <span className="text-xs">
                    {formatCurrency((subtotal * percentage) / 100)}
                  </span>
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-tip">Custom Tip Amount</Label>
              <Input
                id="custom-tip"
                type="number"
                placeholder="0.00"
                value={customTip}
                onChange={e => handleCustomTip(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            {tipAmount > 0 && (
              <div className="rounded-lg bg-green-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-green-700">Tip Amount</span>
                  <span className="font-bold text-green-700">
                    {formatCurrency(tipAmount)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Method Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {PAYMENT_METHODS.map(method => {
                const Icon = method.icon;
                return (
                  <Button
                    key={method.value}
                    variant={
                      paymentMethod === method.value ? 'primary' : 'outline'
                    }
                    onClick={() => setPaymentMethod(method.value)}
                    className="h-12 w-full justify-start"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {method.label}
                  </Button>
                );
              })}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>

              {tipAmount > 0 && (
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Includes tip: {formatCurrency(tipAmount)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Processing */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Payment</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {paymentMethod === 'card' ? (
            <PaymentForm
              appointmentId={appointmentId}
              amount={total}
              description={`Payment for ${appointment.services.map(s => s.serviceName).join(', ')}`}
              onSuccess={handleCardPaymentSuccess}
              onError={handleCardPaymentError}
            />
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium">Cash Payment</span>
                  <span className="text-2xl font-bold">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCashPayment}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Complete Cash Payment
                    </>
                  )}
                </Button>

                {onCancel && (
                  <Button variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
