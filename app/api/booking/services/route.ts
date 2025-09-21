import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const _servicesSchema = z.object({
    businessId: z.string(),
})

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const businessId = searchParams.get('businessId')

        if (!businessId) {
            return NextResponse.json(
                { error: 'Business ID is required' },
                { status: 400 }
            )
        }

        // Verify business exists and has online booking enabled
        const business = await prisma.business.findUnique({
            where: { id: businessId },
            select: {
                id: true,
                name: true,
                bookingEnabled: true,
                onlineBooking: true,
            },
        })

        if (!business || !business.bookingEnabled || !business.onlineBooking) {
            return NextResponse.json(
                { error: 'Online booking is not available for this business' },
                { status: 400 }
            )
        }

        // Get all active services available for online booking
        const services = await prisma.service.findMany({
            where: {
                businessId,
                isActive: true,
                isOnline: true,
            },
            select: {
                id: true,
                name: true,
                description: true,
                category: true,
                price: true,
                duration: true,
            },
            orderBy: [
                { category: 'asc' },
                { name: 'asc' },
            ],
        })

        // Group services by category
        const servicesByCategory = services.reduce((acc, service) => {
            const category = service.category || 'General'
            if (!acc[category]) {
                acc[category] = []
            }
            acc[category].push(service)
            return acc
        }, {} as Record<string, typeof services>)

        return NextResponse.json({
            business: {
                id: business.id,
                name: business.name,
            },
            services: servicesByCategory,
        })
    } catch (error) {
        console.error('Error fetching services:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}