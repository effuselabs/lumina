/**
 * Mock data and utilities for booking tests
 * Provides consistent test data across all booking test suites
 */

export const mockBusiness = {
    id: 'business-123',
    name: 'Test Salon',
    address: '123 Main St, Test City, TC 12345',
    phone: '555-0123',
    email: 'info@testsalon.com',
    logo: '/test-logo.png',
    businessHours: [
        { day: 'monday', open: '09:00', close: '17:00' },
        { day: 'tuesday', open: '09:00', close: '17:00' },
        { day: 'wednesday', open: '09:00', close: '17:00' },
        { day: 'thursday', open: '09:00', close: '17:00' },
        { day: 'friday', open: '09:00', close: '17:00' },
        { day: 'saturday', open: '10:00', close: '16:00' },
        { day: 'sunday', open: '12:00', close: '16:00' }
    ],
    branding: {
        primaryColor: '#FF7A5A',
        secondaryColor: '#FFD25A',
        accentColor: '#0B2B33'
    }
}

export const mockServices = [
    {
        id: 'service-haircut',
        name: 'Haircut',
        description: 'Professional haircut and styling',
        duration: 60,
        price: 50,
        category: 'Hair Services',
        staffIds: ['staff-1', 'staff-2'],
        isActive: true
    },
    {
        id: 'service-styling',
        name: 'Hair Styling',
        description: 'Professional hair styling and finishing',
        duration: 30,
        price: 30,
        category: 'Hair Services',
        staffIds: ['staff-1', 'staff-2'],
        isActive: true
    },
    {
        id: 'service-coloring',
        name: 'Hair Coloring',
        description: 'Full hair coloring service',
        duration: 120,
        price: 100,
        category: 'Hair Services',
        staffIds: ['staff-1'],
        isActive: true
    },
    {
        id: 'service-treatment',
        name: 'Hair Treatment',
        description: 'Deep conditioning hair treatment',
        duration: 45,
        price: 40,
        category: 'Hair Services',
        staffIds: ['staff-2'],
        isActive: true
    }
]

export const mockStaff = [
    {
        id: 'staff-1',
        name: 'John Doe',
        email: 'john@testsalon.com',
        specialties: ['Haircut', 'Hair Coloring'],
        isActive: true
    },
    {
        id: 'staff-2',
        name: 'Jane Smith',
        email: 'jane@testsalon.com',
        specialties: ['Hair Styling', 'Hair Treatment'],
        isActive: true
    }
]

export const mockAvailableSlots = [
    {
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        staffId: 'staff-1',
        staffName: 'John Doe',
        isAvailable: true,
        totalDuration: 60,
        totalPrice: 50
    },
    {
        startTime: new Date('2024-01-15T11:00:00Z'),
        endTime: new Date('2024-01-15T12:00:00Z'),
        staffId: 'staff-1',
        staffName: 'John Doe',
        isAvailable: true,
        totalDuration: 60,
        totalPrice: 50
    },
    {
        startTime: new Date('2024-01-15T14:00:00Z'),
        endTime: new Date('2024-01-15T15:00:00Z'),
        staffId: 'staff-2',
        staffName: 'Jane Smith',
        isAvailable: true,
        totalDuration: 60,
        totalPrice: 50
    },
    {
        startTime: new Date('2024-01-15T15:00:00Z'),
        endTime: new Date('2024-01-15T16:00:00Z'),
        staffId: 'staff-2',
        staffName: 'Jane Smith',
        isAvailable: true,
        totalDuration: 60,
        totalPrice: 50
    }
]

export const mockClientData = {
    new: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '555-0123',
        notes: 'First time client',
        isNewClient: true,
        marketingOptIn: false
    },
    returning: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-0456',
        notes: 'Regular client, prefers organic products',
        isNewClient: false,
        marketingOptIn: true
    }
}

export const mockAppointment = {
    id: 'apt-123',
    confirmationNumber: 'CONF-123',
    dateTime: new Date('2024-01-15T10:00:00Z'),
    services: [mockServices[0]],
    staff: mockStaff[0],
    client: mockClientData.new,
    totalDuration: 60,
    totalPrice: 50,
    notes: 'Please use organic products',
    status: 'confirmed'
}

export const mockBookingErrors = {
    businessNotFound: {
        type: 'BUSINESS_NOT_FOUND',
        message: 'Business not found or inactive',
        userMessage: 'Sorry, this booking page is not available.',
        suggestions: ['Contact the business directly', 'Check the booking link']
    },
    slotUnavailable: {
        type: 'SLOT_UNAVAILABLE',
        message: 'Selected time slot is no longer available',
        userMessage: 'This time slot is no longer available.',
        suggestions: ['Choose a different time', 'Select an alternative staff member'],
        alternativeSlots: [
            {
                startTime: new Date('2024-01-15T11:00:00Z'),
                endTime: new Date('2024-01-15T12:00:00Z'),
                staffId: 'staff-1',
                staffName: 'John Doe'
            }
        ]
    },
    bookingConflict: {
        type: 'BOOKING_CONFLICT',
        message: 'Booking conflict detected',
        userMessage: 'There was a conflict with your booking.',
        suggestions: ['Try a different time slot', 'Contact the salon directly'],
        alternativeSlots: mockAvailableSlots.slice(1, 3)
    },
    networkError: {
        type: 'NETWORK_ERROR',
        message: 'Network connection failed',
        userMessage: 'Unable to connect. Please check your internet connection.',
        suggestions: ['Check your connection', 'Try again in a moment']
    }
}

// Mock API response builders
export const createMockApiResponse = {
    businessInfo: (overrides: any = {}) => ({
        business: { ...mockBusiness, ...overrides.business },
        services: overrides.services || mockServices,
        businessHours: overrides.businessHours || mockBusiness.businessHours
    }),

    availability: (overrides: any = {}) => ({
        availableSlots: overrides.availableSlots || mockAvailableSlots,
        nextAvailableDate: overrides.nextAvailableDate || '2024-01-15'
    }),

    booking: (overrides: any = {}) => ({
        appointment: { ...mockAppointment, ...overrides.appointment },
        confirmationSent: overrides.confirmationSent !== false
    }),

    clientLookup: (exists = false, clientData = null) => ({
        clientExists: exists,
        clientData: exists ? (clientData || mockClientData.returning) : null
    })
}

// Test utilities for mocking API calls
export const mockBookingApi = {
    getBusinessInfo: jest.fn(),
    getAvailableSlots: jest.fn(),
    createBooking: jest.fn(),
    lookupClient: jest.fn(),
    validateSlotAvailability: jest.fn()
}

// Setup default mock implementations
export const setupDefaultMocks = () => {
    mockBookingApi.getBusinessInfo.mockResolvedValue(
        createMockApiResponse.businessInfo()
    )

    mockBookingApi.getAvailableSlots.mockResolvedValue(
        createMockApiResponse.availability()
    )

    mockBookingApi.createBooking.mockResolvedValue(
        createMockApiResponse.booking()
    )

    mockBookingApi.lookupClient.mockResolvedValue(
        createMockApiResponse.clientLookup(false)
    )

    mockBookingApi.validateSlotAvailability.mockResolvedValue(true)
}

// Reset all mocks
export const resetMocks = () => {
    Object.values(mockBookingApi).forEach(mock => {
        if (jest.isMockFunction(mock)) {
            mock.mockReset()
        }
    })
}

// Performance testing utilities
export const createPerformanceMock = (delay: number) => {
    return jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, delay))
    )
}

// Error simulation utilities
export const simulateError = (errorType: keyof typeof mockBookingErrors) => {
    return jest.fn().mockRejectedValue(mockBookingErrors[errorType])
}

// Accessibility testing utilities
export const mockAccessibilityFeatures = {
    highContrast: () => {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: jest.fn().mockImplementation(query => ({
                matches: query === '(prefers-contrast: high)',
                media: query,
                onchange: null,
                addListener: jest.fn(),
                removeListener: jest.fn(),
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                dispatchEvent: jest.fn(),
            })),
        })
    },

    reducedMotion: () => {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: jest.fn().mockImplementation(query => ({
                matches: query === '(prefers-reduced-motion: reduce)',
                media: query,
                onchange: null,
                addListener: jest.fn(),
                removeListener: jest.fn(),
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                dispatchEvent: jest.fn(),
            })),
        })
    },

    screenReader: () => {
        // Mock screen reader announcements
        const announcements: string[] = []

        Object.defineProperty(window, 'speechSynthesis', {
            writable: true,
            value: {
                speak: jest.fn((utterance) => {
                    announcements.push(utterance.text)
                }),
                cancel: jest.fn(),
                pause: jest.fn(),
                resume: jest.fn(),
                getVoices: jest.fn(() => [])
            }
        })

        return announcements
    }
}

// Mobile testing utilities
export const mockMobileFeatures = {
    touchEvents: () => {
        // Mock touch event support
        Object.defineProperty(window, 'ontouchstart', {
            writable: true,
            value: {}
        })

        // Mock viewport meta tag
        const viewportMeta = document.createElement('meta')
        viewportMeta.name = 'viewport'
        viewportMeta.content = 'width=device-width, initial-scale=1'
        document.head.appendChild(viewportMeta)
    },

    orientationChange: () => {
        Object.defineProperty(window, 'orientation', {
            writable: true,
            value: 0
        })

        return {
            portrait: () => {
                window.orientation = 0
                window.dispatchEvent(new Event('orientationchange'))
            },
            landscape: () => {
                window.orientation = 90
                window.dispatchEvent(new Event('orientationchange'))
            }
        }
    }
}