/**
 * Transactions API
 * 
 * Handles transaction retrieval and reporting with business-scoped access
 */

import { auth } from '@/auth';
import {
    getTransactionAuditTrail
} from '@/lib/financial/transaction-service';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const transactionQuerySchema = z.object({
    businessId: z.string().optional(),
    staffId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    type: z.enum(['PAYMENT', 'REFUND', 'COMMISSION', 'CHAIR_RENTAL', 'TIP', 'DEPOSIT']).optional(),
    status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED']).optional(),
    employmentType: z.enum(['COMMISSION', 'CHAIR_RENTAL', 'HYBRID']).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
});

/**
 * GET /api/transactions
 * Retrieves transactions with filtering and pagination
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const query = transactionQuerySchema.parse(Object.fromEntries(searchParams));

        // Default date range (last 30 days)
        const endDate = query.endDate ? new Date(query.endDate) : new Date();
        const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Pagination
        const page = parseInt(query.page || '1');
        const limit = parseInt(query.limit || '50');
        const offset = (page - 1) * limit;

        // Get user's businesses
        const userBusinesses = await prisma.businessUser.findMany({
            where: { userId: session.user.id },
            select: { businessId: true, role: true },
        });

        if (userBusinesses.length === 0) {
            return NextResponse.json({ transactions: [], total: 0, page, limit });
        }

        const businessIds = userBusinesses.map(b => b.businessId);

        // If specific business requested, verify access
        let targetBusinessId: string | undefined;
        if (query.businessId) {
            if (!businessIds.includes(query.businessId)) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
            targetBusinessId = query.businessId;
        }

        // Build where clause
        const where: any = {
            businessId: targetBusinessId ? targetBusinessId : { in: businessIds },
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        };

        if (query.staffId) where.staffId = query.staffId;
        if (query.type) where.type = query.type;
        if (query.status) where.status = query.status;
        if (query.employmentType) where.staffEmploymentType = query.employmentType;

        // Get transactions with pagination
        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                include: {
                    business: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
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
                },
                orderBy: { createdAt: 'desc' },
                skip: offset,
                take: limit,
            }),
            prisma.transaction.count({ where }),
        ]);

        // Format transactions for response
        const formattedTransactions = transactions.map(transaction => ({
            id: transaction.id,
            businessId: transaction.businessId,
            businessName: transaction.business.name,
            appointmentId: transaction.appointmentId,
            staffId: transaction.staffId,
            staffName: transaction.staff?.displayName,
            type: transaction.type,
            status: transaction.status,
            amount: transaction.amount.toNumber(),
            currency: transaction.currency,
            paymentMethod: transaction.paymentMethod,
            paymentId: transaction.paymentId,
            description: transaction.description,
            staffEmploymentType: transaction.staffEmploymentType,
            commissionRate: transaction.commissionRate?.toNumber(),
            commissionAmount: transaction.commissionAmount?.toNumber(),
            chairRentalApplicable: transaction.chairRentalApplicable,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt,
            appointment: transaction.appointment,
            metadata: transaction.metadata ? JSON.parse(transaction.metadata as string) : undefined,
        }));

        return NextResponse.json({
            transactions: formattedTransactions,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('Error retrieving transactions:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid query parameters', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to retrieve transactions' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/transactions/[id]
 * Retrieves a specific transaction with audit trail
 */
export async function getTransactionById(transactionId: string, userId: string) {
    try {
        // Get user's businesses
        const userBusinesses = await prisma.businessUser.findMany({
            where: { userId },
            select: { businessId: true },
        });

        const businessIds = userBusinesses.map(b => b.businessId);

        // Get transaction and verify access
        const transaction = await prisma.transaction.findFirst({
            where: {
                id: transactionId,
                businessId: { in: businessIds },
            },
        });

        if (!transaction) {
            return null;
        }

        // Get full audit trail
        const auditTrail = await getTransactionAuditTrail(transactionId);

        return {
            ...auditTrail,
            transaction: {
                ...auditTrail.transaction,
                amount: auditTrail.transaction.amount,
                commissionAmount: auditTrail.transaction.commissionAmount,
            },
        };
    } catch (error) {
        console.error('Error retrieving transaction:', error);
        throw error;
    }
}