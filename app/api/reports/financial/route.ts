/**
 * Financial Reports API
 *
 * Provides comprehensive financial reporting with employment type breakdowns
 */

import { auth } from '@/auth';
import {
  calculateBusinessRevenue,
  calculateStaffEarnings,
  getBusinessTransactions,
} from '@/lib/financial/transaction-service';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const reportQuerySchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reportType: z
    .enum(['revenue', 'staff', 'employment', 'detailed'])
    .optional()
    .default('detailed'),
  staffId: z.string().optional(),
  employmentType: z.enum(['COMMISSION', 'CHAIR_RENTAL', 'HYBRID']).optional(),
});

/**
 * GET /api/reports/financial
 * Generates comprehensive financial reports
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = reportQuerySchema.parse(Object.fromEntries(searchParams));

    const {
      businessId,
      startDate,
      endDate,
      reportType,
      staffId,
      employmentType,
    } = query;

    // Verify user has access to this business
    const businessUser = await prisma.businessUser.findFirst({
      where: {
        businessId,
        userId: session.user.id,
      },
    });

    if (!businessUser) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);

    // Get business details
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        financialModel: true,
        currency: true,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    let report: any = {
      businessId,
      businessName: business.name,
      period: {
        start: startDateTime,
        end: endDateTime,
      },
      currency: business.currency,
      generatedAt: new Date(),
    };

    switch (reportType) {
      case 'revenue':
        report = {
          ...report,
          ...(await generateRevenueReport(
            businessId,
            startDateTime,
            endDateTime,
            employmentType
          )),
        };
        break;

      case 'staff':
        if (!staffId) {
          return NextResponse.json(
            { error: 'Staff ID is required for staff reports' },
            { status: 400 }
          );
        }
        report = {
          ...report,
          ...(await generateStaffReport(staffId, startDateTime, endDateTime)),
        };
        break;

      case 'employment':
        report = {
          ...report,
          ...(await generateEmploymentReport(
            businessId,
            startDateTime,
            endDateTime
          )),
        };
        break;

      case 'detailed':
      default:
        report = {
          ...report,
          ...(await generateDetailedReport(
            businessId,
            startDateTime,
            endDateTime,
            staffId,
            employmentType
          )),
        };
        break;
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating financial report:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate financial report' },
      { status: 500 }
    );
  }
}

/**
 * Generates revenue-focused report
 */
async function generateRevenueReport(
  businessId: string,
  startDate: Date,
  endDate: Date,
  employmentType?: string
) {
  const revenueData = await calculateBusinessRevenue(
    businessId,
    startDate,
    endDate,
    employmentType ? { employmentType: employmentType as any } : undefined
  );

  // Get daily revenue breakdown
  const dailyRevenue = await getDailyRevenueBreakdown(
    businessId,
    startDate,
    endDate
  );

  return {
    revenue: {
      total: revenueData.totalRevenue,
      refunds: revenueData.totalRefunds,
      net: revenueData.netRevenue,
      transactionCount: revenueData.transactionCount,
      averageTransaction: revenueData.averageTransactionAmount,
      dailyBreakdown: dailyRevenue,
    },
  };
}

/**
 * Generates staff-specific report
 */
async function generateStaffReport(
  staffId: string,
  startDate: Date,
  endDate: Date
) {
  const staffEarnings = await calculateStaffEarnings(
    staffId,
    startDate,
    endDate
  );

  // Get staff details
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!staff) {
    throw new Error('Staff not found');
  }

  return {
    staff: {
      id: staff.id,
      name: staff.displayName,
      email: staff.user.email,
      employmentType: staff.employmentType,
      commissionRate: staff.commissionRate?.toNumber(),
      chairRentalAmount: staff.chairRentalAmount?.toNumber(),
      earnings: {
        totalRevenue: staffEarnings.totalRevenue,
        totalCommissions: staffEarnings.totalCommissions,
        transactionCount: staffEarnings.transactionCount,
        averageCommissionRate: staffEarnings.averageCommissionRate,
      },
    },
  };
}

/**
 * Generates employment type breakdown report
 */
async function generateEmploymentReport(
  businessId: string,
  startDate: Date,
  endDate: Date
) {
  // Get all staff with their employment types
  const staff = await prisma.staff.findMany({
    where: {
      businessId,
      isActive: true,
    },
    select: {
      id: true,
      displayName: true,
      employmentType: true,
      commissionRate: true,
      chairRentalAmount: true,
      chairRentalPeriod: true,
      baseSalary: true,
    },
  });

  // Get transactions grouped by employment type
  const employmentBreakdown = await Promise.all([
    calculateBusinessRevenue(businessId, startDate, endDate, {
      employmentType: 'COMMISSION',
    }),
    calculateBusinessRevenue(businessId, startDate, endDate, {
      employmentType: 'CHAIR_RENTAL',
    }),
    calculateBusinessRevenue(businessId, startDate, endDate, {
      employmentType: 'HYBRID',
    }),
  ]);

  const [commissionData, chairRentalData, hybridData] = employmentBreakdown;

  return {
    employmentBreakdown: {
      commission: {
        staffCount: staff.filter(s => s.employmentType === 'COMMISSION').length,
        totalRevenue: commissionData.totalRevenue,
        netRevenue: commissionData.netRevenue,
        transactionCount: commissionData.transactionCount,
        averagePerStaff:
          staff.filter(s => s.employmentType === 'COMMISSION').length > 0
            ? commissionData.totalRevenue /
              staff.filter(s => s.employmentType === 'COMMISSION').length
            : 0,
      },
      chairRental: {
        staffCount: staff.filter(s => s.employmentType === 'CHAIR_RENTAL')
          .length,
        totalRevenue: chairRentalData.totalRevenue,
        netRevenue: chairRentalData.netRevenue,
        transactionCount: chairRentalData.transactionCount,
        averagePerStaff:
          staff.filter(s => s.employmentType === 'CHAIR_RENTAL').length > 0
            ? chairRentalData.totalRevenue /
              staff.filter(s => s.employmentType === 'CHAIR_RENTAL').length
            : 0,
      },
      hybrid: {
        staffCount: staff.filter(s => s.employmentType === 'HYBRID').length,
        totalRevenue: hybridData.totalRevenue,
        netRevenue: hybridData.netRevenue,
        transactionCount: hybridData.transactionCount,
        averagePerStaff:
          staff.filter(s => s.employmentType === 'HYBRID').length > 0
            ? hybridData.totalRevenue /
              staff.filter(s => s.employmentType === 'HYBRID').length
            : 0,
      },
    },
    staffSummary: staff.map(s => ({
      id: s.id,
      name: s.displayName,
      employmentType: s.employmentType,
      commissionRate: s.commissionRate?.toNumber(),
      chairRentalAmount: s.chairRentalAmount?.toNumber(),
      chairRentalPeriod: s.chairRentalPeriod,
    })),
  };
}

/**
 * Generates comprehensive detailed report
 */
async function generateDetailedReport(
  businessId: string,
  startDate: Date,
  endDate: Date,
  staffId?: string,
  employmentType?: string
) {
  // Get all report components
  const [revenueReport, employmentReport] = await Promise.all([
    generateRevenueReport(businessId, startDate, endDate, employmentType),
    generateEmploymentReport(businessId, startDate, endDate),
  ]);

  // Get recent transactions
  const recentTransactions = await getBusinessTransactions(
    businessId,
    startDate,
    endDate,
    {
      ...(staffId && { staffId }),
      ...(employmentType && { employmentType: employmentType as any }),
    }
  );

  const formattedTransactions = recentTransactions.slice(0, 20).map(t => ({
    id: t.id,
    date: t.createdAt,
    type: t.type,
    amount: t.amount,
    staffName: t.staff?.displayName,
    appointmentId: t.appointmentId,
    status: t.status,
    commissionAmount: t.commissionAmount,
    employmentType: t.staffEmploymentType,
  }));

  return {
    ...revenueReport,
    ...employmentReport,
    recentTransactions: formattedTransactions,
    summary: {
      totalStaff: employmentReport.staffSummary.length,
      activeEmploymentTypes: [
        ...(employmentReport.employmentBreakdown.commission.staffCount > 0
          ? ['COMMISSION']
          : []),
        ...(employmentReport.employmentBreakdown.chairRental.staffCount > 0
          ? ['CHAIR_RENTAL']
          : []),
        ...(employmentReport.employmentBreakdown.hybrid.staffCount > 0
          ? ['HYBRID']
          : []),
      ],
      totalBusinessRetention:
        revenueReport.revenue.net -
        (employmentReport.employmentBreakdown.commission.totalRevenue * 0.5 + // Estimated commission payout
          employmentReport.employmentBreakdown.hybrid.totalRevenue * 0.3), // Estimated hybrid payout
    },
  };
}

/**
 * Gets daily revenue breakdown
 */
async function getDailyRevenueBreakdown(
  businessId: string,
  startDate: Date,
  endDate: Date
) {
  const transactions = await prisma.transaction.findMany({
    where: {
      businessId,
      type: 'PAYMENT',
      status: 'COMPLETED',
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      amount: true,
      createdAt: true,
    },
  });

  // Group by day
  const dailyData = new Map<string, number>();

  transactions.forEach(transaction => {
    const day = transaction.createdAt.toISOString().split('T')[0];
    const current = dailyData.get(day) || 0;
    dailyData.set(day, current + transaction.amount.toNumber());
  });

  return Array.from(dailyData.entries())
    .map(([date, amount]) => ({
      date,
      amount,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
