import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';

export interface ChartData {
    revenue: Array<{
        date: string;
        revenue: number;
        target?: number;
        appointments?: number;
    }>;
    appointments: Array<{
        date: string;
        scheduled: number;
        completed: number;
        cancelled: number;
        noShow: number;
    }>;
    services: Array<{
        name: string;
        count: number;
        revenue: number;
        color: string;
    }>;
    staff: Array<{
        name: string;
        revenue: number;
        appointments: number;
        utilization: number;
        rating: number;
        commissionEarned: number;
        employmentType: 'COMMISSION' | 'CHAIR_RENTAL' | 'HYBRID';
    }>;
}

async function verifyBusinessAccess(userId: string, businessId: string): Promise<boolean> {
    const businessUser = await prisma.businessUser.findFirst({
        where: {
            userId,
            businessId,
        },
    });

    return !!businessUser;
}

async function generateRevenueData(businessId: string, days: number = 7) {
    const data = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
        const date = subDays(today, i);
        const startDate = startOfDay(date);
        const endDate = endOfDay(date);

        // Get appointments for this day
        const appointments = await prisma.appointment.count({
            where: {
                businessId,
                startTime: {
                    gte: startDate,
                    lte: endDate,
                },
                status: 'COMPLETED',
            },
        });

        // Mock revenue calculation (average $75 per appointment)
        const revenue = appointments * 75;
        const target = 500; // Mock daily target

        data.push({
            date: format(date, 'yyyy-MM-dd'),
            revenue,
            target,
            appointments,
        });
    }

    return data;
}

async function generateAppointmentData(businessId: string, days: number = 7) {
    const data = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
        const date = subDays(today, i);
        const startDate = startOfDay(date);
        const endDate = endOfDay(date);

        const [scheduled, completed, cancelled, noShow] = await Promise.all([
            prisma.appointment.count({
                where: {
                    businessId,
                    startTime: { gte: startDate, lte: endDate },
                    status: 'SCHEDULED',
                },
            }),
            prisma.appointment.count({
                where: {
                    businessId,
                    startTime: { gte: startDate, lte: endDate },
                    status: 'COMPLETED',
                },
            }),
            prisma.appointment.count({
                where: {
                    businessId,
                    startTime: { gte: startDate, lte: endDate },
                    status: 'CANCELLED',
                },
            }),
            prisma.appointment.count({
                where: {
                    businessId,
                    startTime: { gte: startDate, lte: endDate },
                    status: 'NO_SHOW',
                },
            }),
        ]);

        data.push({
            date: format(date, 'yyyy-MM-dd'),
            scheduled,
            completed,
            cancelled,
            noShow,
        });
    }

    return data;
}

async function generateServiceData(businessId: string) {
    const services = await prisma.service.findMany({
        where: {
            businessId,
            isActive: true,
        },
        include: {
            appointments: {
                where: {
                    status: 'COMPLETED',
                    startTime: {
                        gte: subDays(new Date(), 30), // Last 30 days
                    },
                },
            },
        },
    });

    const colors = ['#22C58B', '#3B82F6', '#8B5CF6', '#F59E0B', '#E5484D', '#06B6D4'];

    return services
        .map((service, index) => ({
            name: service.name,
            count: service.appointments.length,
            revenue: service.appointments.length * service.price,
            color: colors[index % colors.length],
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6); // Top 6 services
}

async function generateStaffData(businessId: string) {
    const staff = await prisma.staff.findMany({
        where: {
            businessId,
            isActive: true,
        },
        include: {
            appointments: {
                where: {
                    status: 'COMPLETED',
                    startTime: {
                        gte: subDays(new Date(), 30), // Last 30 days
                    },
                },
                include: {
                    service: true,
                },
            },
            businessUser: true,
        },
    });

    return staff.map(member => {
        const appointments = member.appointments.length;
        const revenue = member.appointments.reduce((sum, apt) => sum + (apt.service?.price || 0), 0);

        // Mock calculations
        const utilization = Math.min(85 + Math.random() * 15, 100); // 85-100%
        const rating = 4.2 + Math.random() * 0.8; // 4.2-5.0 stars

        // Calculate commission based on employment type
        let commissionEarned = 0;
        if (member.employmentType === 'COMMISSION') {
            commissionEarned = revenue * ((member.commissionRate || 50) / 100);
        } else if (member.employmentType === 'HYBRID') {
            commissionEarned = revenue * ((member.commissionRate || 30) / 100) + (member.baseSalary || 0);
        } else if (member.employmentType === 'CHAIR_RENTAL') {
            commissionEarned = Math.max(0, revenue - (member.chairRentalAmount || 0));
        }

        return {
            name: member.displayName,
            revenue,
            appointments,
            utilization: Math.round(utilization),
            rating: Math.round(rating * 10) / 10,
            commissionEarned,
            employmentType: member.employmentType as 'COMMISSION' | 'CHAIR_RENTAL' | 'HYBRID',
        };
    }).sort((a, b) => b.revenue - a.revenue);
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const businessId = searchParams.get('businessId');
        const period = searchParams.get('period') || 'weekly';

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        // Verify user has access to business
        const hasAccess = await verifyBusinessAccess(session.user.id, businessId);
        if (!hasAccess) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Determine number of days based on period
        const days = period === 'daily' ? 7 : period === 'weekly' ? 14 : 30;

        // Generate all chart data
        const [revenueData, appointmentData, serviceData, staffData] = await Promise.all([
            generateRevenueData(businessId, days),
            generateAppointmentData(businessId, days),
            generateServiceData(businessId),
            generateStaffData(businessId),
        ]);

        const chartData: ChartData = {
            revenue: revenueData,
            appointments: appointmentData,
            services: serviceData,
            staff: staffData,
        };

        return NextResponse.json({ charts: chartData });
    } catch (error) {
        // Log error for debugging
        console.error('Dashboard charts error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch chart data' },
            { status: 500 }
        );
    }
}