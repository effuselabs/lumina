/**
 * End-to-end tests for public booking interface
 * Tests complete booking workflows on mobile and desktop
 */

import { devices, expect, test } from '@playwright/test'

const BUSINESS_ID = 'test-business-123'
const BOOKING_URL = `/book/${BUSINESS_ID}`

// Desktop tests
test.describe('Public Booking - Desktop', () => {
    test.beforeEach(async ({ page }) => {
        // Mock API responses
        await page.route('**/api/public/booking/**', async (route) => {
            const url = route.request().url()

            if (url.includes('/availability')) {
                await route.fulfill({
                    json: {
                        availableSlots: [
                            {
                                startTime: '2024-01-15T10:00:00Z',
                                endTime: '2024-01-15T11:00:00Z',
                                staffId: 'staff-1',
                                staffName: 'John Doe',
                                isAvailable: true,
                                totalDuration: 60,
                                totalPrice: 50
                            },
                            {
                                startTime: '2024-01-15T14:00:00Z',
                                endTime: '2024-01-15T15:00:00Z',
                                staffId: 'staff-1',
                                staffName: 'John Doe',
                                isAvailable: true,
                                totalDuration: 60,
                                totalPrice: 50
                            }
                        ],
                        nextAvailableDate: '2024-01-15'
                    }
                })
            } else if (url.includes('/book')) {
                await route.fulfill({
                    json: {
                        appointment: {
                            id: 'apt-123',
                            confirmationNumber: 'CONF-123',
                            dateTime: '2024-01-15T10:00:00Z',
                            services: [{ name: 'Haircut', price: 50 }],
                            staff: { name: 'John Doe' },
                            client: { firstName: 'Jane', lastName: 'Smith' },
                            totalDuration: 60,
                            totalPrice: 50
                        },
                        confirmationSent: true
                    }
                })
            } else {
                // Business info endpoint
                await route.fulfill({
                    json: {
                        business: {
                            name: 'Test Salon',
                            address: '123 Main St',
                            phone: '555-0123',
                            email: 'info@testsalon.com',
                            logo: '/logo.png'
                        },
                        services: [
                            {
                                id: 'service-haircut',
                                name: 'Haircut',
                                description: 'Professional haircut and styling',
                                duration: 60,
                                price: 50,
                                category: 'Hair Services'
                            },
                            {
                                id: 'service-styling',
                                name: 'Hair Styling',
                                description: 'Professional hair styling',
                                duration: 30,
                                price: 30,
                                category: 'Hair Services'
                            }
                        ],
                        businessHours: [
                            { day: 'monday', open: '09:00', close: '17:00' },
                            { day: 'tuesday', open: '09:00', close: '17:00' }
                        ]
                    }
                })
            }
        })
    })

    test('should complete full booking workflow on desktop', async ({ page }) => {
        await page.goto(BOOKING_URL)

        // Verify business information loads
        await expect(page.getByText('Test Salon')).toBeVisible()
        await expect(page.getByText('123 Main St')).toBeVisible()

        // Step 1: Service Selection
        await expect(page.getByText('Select Services')).toBeVisible()
        await page.getByTestId('service-haircut').click()

        // Verify service details are shown
        await expect(page.getByText('Professional haircut and styling')).toBeVisible()
        await expect(page.getByText('$50.00')).toBeVisible()

        await page.getByText('Continue to Time Selection').click()

        // Step 2: Time Selection
        await expect(page.getByText('Select Date & Time')).toBeVisible()

        // Verify calendar navigation works
        await page.getByTestId('calendar-next-month').click()
        await page.getByTestId('calendar-prev-month').click()

        // Select time slot
        await page.getByTestId('slot-2024-01-15-10:00').click()
        await expect(page.getByText('10:00 AM with John Doe')).toBeVisible()

        await page.getByText('Continue to Client Information').click()

        // Step 3: Client Information
        await expect(page.getByText('Your Information')).toBeVisible()

        await page.getByLabel('First Name').fill('Jane')
        await page.getByLabel('Last Name').fill('Smith')
        await page.getByLabel('Email').fill('jane@example.com')
        await page.getByLabel('Phone').fill('555-0123')

        // Optional notes field
        await page.getByLabel('Special requests or notes').fill('Please use organic products')

        await page.getByText('Book Appointment').click()

        // Step 4: Confirmation
        await expect(page.getByText('Booking Confirmed!')).toBeVisible()
        await expect(page.getByText('CONF-123')).toBeVisible()
        await expect(page.getByText('Jane Smith')).toBeVisible()
        await expect(page.getByText('January 15, 2024 at 10:00 AM')).toBeVisible()

        // Verify confirmation email notice
        await expect(page.getByText('A confirmation email has been sent')).toBeVisible()
    })

    test('should handle multi-service booking on desktop', async ({ page }) => {
        await page.goto(BOOKING_URL)

        await expect(page.getByText('Select Services')).toBeVisible()

        // Select multiple services
        await page.getByTestId('service-haircut').click()
        await page.getByTestId('service-styling').click()

        // Verify total calculation
        await expect(page.getByText('Total Duration: 90 minutes')).toBeVisible()
        await expect(page.getByText('Total Price: $80.00')).toBeVisible()

        await page.getByText('Continue to Time Selection').click()

        // Verify longer time slots are shown for multi-service booking
        await expect(page.getByText('90 min appointment')).toBeVisible()
    })
})

// Mobile tests
test.describe('Public Booking - Mobile', () => {
    test.use({ ...devices['iPhone 13'] })

    test.beforeEach(async ({ page }) => {
        // Same API mocking as desktop tests
        await page.route('**/api/public/booking/**', async (route) => {
            const url = route.request().url()

            if (url.includes('/availability')) {
                await route.fulfill({
                    json: {
                        availableSlots: [
                            {
                                startTime: '2024-01-15T10:00:00Z',
                                endTime: '2024-01-15T11:00:00Z',
                                staffId: 'staff-1',
                                staffName: 'John Doe',
                                isAvailable: true,
                                totalDuration: 60,
                                totalPrice: 50
                            }
                        ]
                    }
                })
            } else if (url.includes('/book')) {
                await route.fulfill({
                    json: {
                        appointment: {
                            id: 'apt-123',
                            confirmationNumber: 'CONF-123',
                            dateTime: '2024-01-15T10:00:00Z',
                            services: [{ name: 'Haircut', price: 50 }],
                            staff: { name: 'John Doe' },
                            client: { firstName: 'Jane', lastName: 'Smith' },
                            totalDuration: 60,
                            totalPrice: 50
                        },
                        confirmationSent: true
                    }
                })
            } else {
                await route.fulfill({
                    json: {
                        business: {
                            name: 'Test Salon',
                            address: '123 Main St',
                            phone: '555-0123',
                            email: 'info@testsalon.com'
                        },
                        services: [
                            {
                                id: 'service-haircut',
                                name: 'Haircut',
                                description: 'Professional haircut and styling',
                                duration: 60,
                                price: 50,
                                category: 'Hair Services'
                            }
                        ],
                        businessHours: []
                    }
                })
            }
        })
    })

    test('should complete booking workflow on mobile with touch interactions', async ({ page }) => {
        await page.goto(BOOKING_URL)

        // Verify mobile-optimized layout
        await expect(page.getByText('Test Salon')).toBeVisible()

        // Test touch interactions for service selection
        await page.getByTestId('service-haircut').tap()

        // Verify mobile-friendly button sizing (minimum 44px touch target)
        const continueButton = page.getByText('Continue to Time Selection')
        await expect(continueButton).toBeVisible()

        const buttonBox = await continueButton.boundingBox()
        expect(buttonBox?.height).toBeGreaterThanOrEqual(44)

        await continueButton.tap()

        // Test mobile calendar navigation with swipe gestures
        await expect(page.getByText('Select Date & Time')).toBeVisible()

        // Test swipe navigation (simulate touch events)
        const calendar = page.getByTestId('mobile-calendar')
        await calendar.hover()
        await page.mouse.down()
        await page.mouse.move(-100, 0) // Swipe left
        await page.mouse.up()

        // Select time slot with tap
        await page.getByTestId('slot-2024-01-15-10:00').tap()
        await page.getByText('Continue to Client Information').tap()

        // Test mobile form interactions
        await page.getByLabel('First Name').tap()
        await page.getByLabel('First Name').fill('Jane')

        // Test mobile keyboard handling
        await page.getByLabel('Phone').tap()
        await page.getByLabel('Phone').fill('555-0123')

        await page.getByLabel('Email').tap()
        await page.getByLabel('Email').fill('jane@example.com')

        await page.getByText('Book Appointment').tap()

        // Verify mobile confirmation layout
        await expect(page.getByText('Booking Confirmed!')).toBeVisible()
        await expect(page.getByText('CONF-123')).toBeVisible()
    })

    test('should handle mobile viewport changes and orientation', async ({ page }) => {
        await page.goto(BOOKING_URL)

        // Test portrait orientation
        await page.setViewportSize({ width: 375, height: 667 })
        await expect(page.getByText('Test Salon')).toBeVisible()

        // Test landscape orientation
        await page.setViewportSize({ width: 667, height: 375 })
        await expect(page.getByText('Test Salon')).toBeVisible()

        // Verify responsive layout adjustments
        const serviceCard = page.getByTestId('service-haircut')
        await expect(serviceCard).toBeVisible()

        // Test that content is still accessible in landscape
        await serviceCard.tap()
        await expect(page.getByText('Continue to Time Selection')).toBeVisible()
    })

    test('should handle mobile-specific error states', async ({ page }) => {
        // Mock network error
        await page.route('**/api/public/booking/**', async (route) => {
            await route.abort('failed')
        })

        await page.goto(BOOKING_URL)

        // Verify mobile-friendly error message
        await expect(page.getByText('Unable to load booking information')).toBeVisible()
        await expect(page.getByText('Check your connection and try again')).toBeVisible()

        // Test retry button on mobile
        const retryButton = page.getByText('Retry')
        await expect(retryButton).toBeVisible()

        const retryBox = await retryButton.boundingBox()
        expect(retryBox?.height).toBeGreaterThanOrEqual(44) // Mobile touch target
    })
})

// Cross-browser compatibility tests
test.describe('Public Booking - Cross Browser', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
        test(`should work correctly in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
            test.skip(currentBrowser !== browserName, `Skipping ${browserName} test`)

            await page.route('**/api/public/booking/**', async (route) => {
                await route.fulfill({
                    json: {
                        business: { name: 'Test Salon' },
                        services: [{ id: 'service-haircut', name: 'Haircut', price: 50 }],
                        businessHours: []
                    }
                })
            })

            await page.goto(BOOKING_URL)

            // Basic functionality test across browsers
            await expect(page.getByText('Test Salon')).toBeVisible()
            await expect(page.getByTestId('service-haircut')).toBeVisible()

            await page.getByTestId('service-haircut').click()
            await expect(page.getByText('Continue to Time Selection')).toBeVisible()
        })
    })
})