/**
 * Transaction Service for Lumina
 *
 * Handles transaction logging, commission calculations, and financial record keeping
 * with support for hybrid employment models.
 */

import { prisma } from '@/lib/prisma';
import type {
  EmploymentType,
  PaymentMethod,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

export interface CreateTransactionParams {
  businessId: string;
  appointmentId?: string;
  staffId?: string;
  userId?: string;
  type: TransactionType;
  amount: number;
  currency?: string;
  paymentMethod?: PaymentMethod;
  paymentId?: string;
  description?: string;
  metadata?: Record<string, any>;
  staffEmploymentType?: EmploymentType;
  commissionRate?: number;
}

export interface TransactionWithDetails {
  id: string;
  businessId: string;
  appointmentId?: string;
  staffId?: string;
  userId?: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  paymentMethod?: PaymentMethod;
  paymentId?: string;
  description?: string;
  metadata?: any;
  staffEmploymentType?: EmploymentType;
  commissionRate?: number;
  commissionAmount?: number;
  chairRentalApplicable: boolean;
  createdAt: Date;
  updatedAt: Date;
  appointment?: {
    id: string;
    startTime: Date;
    endTime: Date;
    clientName?: string;
    services: Array<{
      serviceName: string;
      price: number;
    }>;
  };
  staff?: {
    id: string;
    displayName: string;
    employmentType: EmploymentType;
    commissionRate?: number;
    chairRentalAmount?: number;
  };
}

/**
 * Creates a new transaction record
 */
export async function createTransaction(
  params: CreateTransactionParams
): Promise<TransactionWithDetails> {
  const {
    businessId,
    appointmentId,
    staffId,
    userId,
    type,
    amount,
    currency = 'USD',
    paymentMethod,
    paymentId,
    description,
    metadata,
    staffEmploymentType,
    commissionRate,
  } = params;

  // Calculate commission if staff and employment details are provided
  let calculatedCommissionAmount: number | undefined;
  let chairRentalApplicable = false;

  if (staffId && staffEmploymentType && type === 'PAYMENT') {
    try {
      // Get staff employment details
      const staff = await prisma.staff.findUnique({
        where: { id: staffId },
        select: {
          employmentType: true,
          commissionRate: true,
          chairRentalAmount: true,
          chairRentalPeriod: true,
          baseSalary: true,
        },
      });

      if (staff) {
        const effectiveCommissionRate =
          commissionRate || staff.commissionRate?.toNumber();

        if (
          effectiveCommissionRate &&
          (staff.employmentType === 'COMMISSION' ||
            staff.employmentType === 'HYBRID')
        ) {
          calculatedCommissionAmount = (amount * effectiveCommissionRate) / 100;
        }

        chairRentalApplicable =
          staff.employmentType === 'CHAIR_RENTAL' ||
          staff.employmentType === 'HYBRID';
      }
    } catch (error) {
      console.error('Error calculating commission:', error);
      // Continue without commission calculation
    }
  }

  const transaction = await prisma.transaction.create({
    data: {
      businessId,
      appointmentId,
      staffId,
      userId,
      type,
      status: 'PENDING',
      amount,
      currency,
      paymentMethod,
      paymentId,
      description,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      staffEmploymentType,
      commissionRate: commissionRate ? commissionRate : undefined,
      commissionAmount: calculatedCommissionAmount,
      chairRentalApplicable,
    },
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
          commissionRate: true,
          chairRentalAmount: true,
        },
      },
    },
  });

  return {
    ...transaction,
    appointmentId: transaction.appointmentId || undefined,
    staffId: transaction.staffId || undefined,
    userId: transaction.userId || undefined,
    metadata: transaction.metadata
      ? JSON.parse(transaction.metadata as string)
      : undefined,
  };
}

/**
 * Updates transaction status
 */
export async function updateTransactionStatus(
  transactionId: string,
  status: TransactionStatus,
  metadata?: Record<string, any>
): Promise<TransactionWithDetails> {
  const updateData: any = { status };

  if (metadata) {
    updateData.metadata = JSON.stringify(metadata);
  }

  const transaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: updateData,
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
          commissionRate: true,
          chairRentalAmount: true,
        },
      },
    },
  });

  return {
    ...transaction,
    appointmentId: transaction.appointmentId || undefined,
    staffId: transaction.staffId || undefined,
    userId: transaction.userId || undefined,
    metadata: transaction.metadata
      ? JSON.parse(transaction.metadata as string)
      : undefined,
  };
}

/**
 * Gets transaction by payment ID (Stripe payment intent ID)
 */
export async function getTransactionByPaymentId(
  paymentId: string
): Promise<TransactionWithDetails | null> {
  const transaction = await prisma.transaction.findFirst({
    where: { paymentId },
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
          commissionRate: true,
          chairRentalAmount: true,
        },
      },
    },
  });

  if (!transaction) return null;

  return {
    ...transaction,
    appointmentId: transaction.appointmentId || undefined,
    staffId: transaction.staffId || undefined,
    userId: transaction.userId || undefined,
    metadata: transaction.metadata
      ? JSON.parse(transaction.metadata as string)
      : undefined,
  };
}

/**
 * Gets transactions for a business within a date range
 */
export async function getBusinessTransactions(
  businessId: string,
  startDate: Date,
  endDate: Date,
  filters?: {
    staffId?: string;
    type?: TransactionType;
    status?: TransactionStatus;
    employmentType?: EmploymentType;
  }
): Promise<TransactionWithDetails[]> {
  const where: any = {
    businessId,
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (filters?.staffId) where.staffId = filters.staffId;
  if (filters?.type) where.type = filters.type;
  if (filters?.status) where.status = filters.status;
  if (filters?.employmentType)
    where.staffEmploymentType = filters.employmentType;

  const transactions = await prisma.transaction.findMany({
    where,
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
          commissionRate: true,
          chairRentalAmount: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return transactions.map(transaction => ({
    ...transaction,
    appointmentId: transaction.appointmentId || undefined,
    staffId: transaction.staffId || undefined,
    userId: transaction.userId || undefined,
    metadata: transaction.metadata
      ? JSON.parse(transaction.metadata as string)
      : undefined,
  }));
}

/**
 * Creates a refund transaction
 */
export async function createRefundTransaction(
  originalTransactionId: string,
  refundAmount: number,
  reason?: string,
  metadata?: Record<string, any>
): Promise<TransactionWithDetails> {
  const originalTransaction = await prisma.transaction.findUnique({
    where: { id: originalTransactionId },
  });

  if (!originalTransaction) {
    throw new Error('Original transaction not found');
  }

  return createTransaction({
    businessId: originalTransaction.businessId,
    appointmentId: originalTransaction.appointmentId || undefined,
    staffId: originalTransaction.staffId || undefined,
    userId: originalTransaction.userId || undefined,
    type: 'REFUND',
    amount: refundAmount,
    currency: originalTransaction.currency,
    paymentMethod: originalTransaction.paymentMethod || undefined,
    description: reason || `Refund for transaction ${originalTransactionId}`,
    metadata: {
      ...metadata,
      originalTransactionId,
      refundReason: reason,
    },
  });
}

/**
 * Calculates total revenue for a business in a date range
 */
export async function calculateBusinessRevenue(
  businessId: string,
  startDate: Date,
  endDate: Date,
  filters?: {
    staffId?: string;
    employmentType?: EmploymentType;
  }
): Promise<{
  totalRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  transactionCount: number;
  averageTransactionAmount: number;
}> {
  const where: any = {
    businessId,
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
    status: 'COMPLETED',
  };

  if (filters?.staffId) where.staffId = filters.staffId;
  if (filters?.employmentType)
    where.staffEmploymentType = filters.employmentType;

  const [payments, refunds] = await Promise.all([
    prisma.transaction.findMany({
      where: { ...where, type: 'PAYMENT' },
      select: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { ...where, type: 'REFUND' },
      select: { amount: true },
    }),
  ]);

  const totalRevenue = payments.reduce(
    (sum, t) => sum + t.amount.toNumber(),
    0
  );
  const totalRefunds = refunds.reduce((sum, t) => sum + t.amount.toNumber(), 0);
  const netRevenue = totalRevenue - totalRefunds;
  const transactionCount = payments.length;
  const averageTransactionAmount =
    transactionCount > 0 ? totalRevenue / transactionCount : 0;

  return {
    totalRevenue,
    totalRefunds,
    netRevenue,
    transactionCount,
    averageTransactionAmount,
  };
}

/**
 * Calculates staff earnings from transactions
 */
export async function calculateStaffEarnings(
  staffId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalRevenue: number;
  totalCommissions: number;
  transactionCount: number;
  averageCommissionRate: number;
}> {
  const transactions = await prisma.transaction.findMany({
    where: {
      staffId,
      type: 'PAYMENT',
      status: 'COMPLETED',
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      amount: true,
      commissionAmount: true,
      commissionRate: true,
    },
  });

  const totalRevenue = transactions.reduce(
    (sum, t) => sum + t.amount.toNumber(),
    0
  );
  const totalCommissions = transactions.reduce(
    (sum, t) => sum + (t.commissionAmount?.toNumber() || 0),
    0
  );
  const transactionCount = transactions.length;

  const totalCommissionRate = transactions.reduce(
    (sum, t) => sum + (t.commissionRate?.toNumber() || 0),
    0
  );
  const averageCommissionRate =
    transactionCount > 0 ? totalCommissionRate / transactionCount : 0;

  return {
    totalRevenue,
    totalCommissions,
    transactionCount,
    averageCommissionRate,
  };
}

/**
 * Gets transaction audit trail
 */
export async function getTransactionAuditTrail(transactionId: string): Promise<{
  transaction: TransactionWithDetails;
  relatedTransactions: TransactionWithDetails[];
  statusHistory: Array<{
    status: TransactionStatus;
    timestamp: Date;
    metadata?: any;
  }>;
}> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
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
          commissionRate: true,
          chairRentalAmount: true,
        },
      },
    },
  });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  // Find related transactions (refunds, etc.)
  const relatedTransactions = await prisma.transaction.findMany({
    where: {
      OR: [
        { paymentId: transaction.paymentId },
        { appointmentId: transaction.appointmentId },
      ],
      NOT: { id: transactionId },
    },
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
          commissionRate: true,
          chairRentalAmount: true,
        },
      },
    },
  });

  // For now, we'll create a simple status history from the current transaction
  // In a full implementation, you might want to track status changes in a separate table
  const statusHistory = [
    {
      status: transaction.status,
      timestamp: transaction.updatedAt,
      metadata: transaction.metadata
        ? JSON.parse(transaction.metadata as string)
        : undefined,
    },
  ];

  return {
    transaction: {
      ...transaction,
      appointmentId: transaction.appointmentId || undefined,
      staffId: transaction.staffId || undefined,
      userId: transaction.userId || undefined,
      metadata: transaction.metadata
        ? JSON.parse(transaction.metadata as string)
        : undefined,
    },
    relatedTransactions: relatedTransactions.map(t => ({
      ...t,
      appointmentId: t.appointmentId || undefined,
      staffId: t.staffId || undefined,
      userId: t.userId || undefined,
      metadata: t.metadata ? JSON.parse(t.metadata as string) : undefined,
    })),
    statusHistory,
  };
}
