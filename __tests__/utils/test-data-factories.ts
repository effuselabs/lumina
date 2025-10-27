/**
 * Test Data Factories
 * 
 * Provides factory functions to create properly typed test data objects
 * with all required properties for Prisma models.
 * 
 * Usage:
 * ```typescript
 * import { createTestAppointment, createTestClient } from '@/__tests__/utils/test-data-factories';
 * 
 * const appointment = createTestAppointment({ status: 'CONFIRMED' });
 * const client = createTestClient({ email: 'custom@example.com' });
 * ```
 */

import { AppointmentStatus, UserRole } from '@prisma/client';

/**
 * Create a test user object with all required properties
 */
export function createTestUser(overrides: Partial<any> = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    emailVerified: null,
    name: 'Test User',
    image: null,
    password: null,
    role: UserRole.CLIENT,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test business object with all required properties
 */
export function createTestBusiness(overrides: Partial<any> = {}) {
  return {
    id: 'test-business-id',
    name: 'Test Business',
    slug: 'test-business',
    email: 'business@example.com',
    phone: '+1234567890',
    address: '123 Test St',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
    country: 'US',
    timezone: 'America/New_York',
    currency: 'USD',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test client object with all required properties
 */
export function createTestClient(overrides: Partial<any> = {}) {
  return {
    id: 'test-client-id',
    businessId: 'test-business-id',
    firstName: 'Test',
    lastName: 'Client',
    email: 'client@example.com',
    phone: '+1234567890',
    address: null,
    city: null,
    state: null,
    zipCode: null,
    country: null,
    notes: null,
    preferences: null,
    emailMarketing: false,
    smsMarketing: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test staff object with all required properties
 */
export function createTestStaff(overrides: Partial<any> = {}) {
  const user = createTestUser({ role: UserRole.STAFF });
  return {
    id: 'test-staff-id',
    businessId: 'test-business-id',
    userId: user.id,
    displayName: 'Test Staff',
    title: 'Stylist',
    bio: null,
    phone: '+1234567890',
    email: 'staff@example.com',
    isActive: true,
    commissionRate: 0.5,
    baseSalary: null,
    minimumEarnings: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user,
    ...overrides,
  };
}

/**
 * Create a test service object with all required properties
 */
export function createTestService(overrides: Partial<any> = {}) {
  return {
    id: 'test-service-id',
    businessId: 'test-business-id',
    name: 'Test Service',
    description: 'A test service',
    duration: 60,
    price: 50.0,
    category: 'General',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test appointment service object
 */
export function createTestAppointmentService(overrides: Partial<any> = {}) {
  return {
    id: 'test-appointment-service-id',
    appointmentId: 'test-appointment-id',
    serviceId: 'test-service-id',
    serviceName: 'Test Service',
    price: 50.0,
    duration: 60,
    serviceOrder: 1,
    startOffset: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test appointment object with all required properties
 */
export function createTestAppointment(overrides: Partial<any> = {}) {
  const client = createTestClient();
  const staff = createTestStaff();
  const service = createTestAppointmentService();
  
  return {
    id: 'test-appointment-id',
    businessId: 'test-business-id',
    clientId: client.id,
    staffId: staff.id,
    startTime: new Date(),
    endTime: new Date(Date.now() + 60 * 60 * 1000),
    status: AppointmentStatus.SCHEDULED,
    totalDuration: 60,
    totalPrice: 50.0,
    notes: null,
    internalNotes: null,
    cancellationReason: null,
    cancelledAt: null,
    cancelledBy: null,
    startedAt: null,
    completedAt: null,
    noShowAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    client,
    staff,
    services: [service],
    transactions: [],
    ...overrides,
  };
}

/**
 * Create a test business hours object
 */
export function createTestBusinessHours(overrides: Partial<any> = {}) {
  return {
    id: 'test-business-hours-id',
    businessId: 'test-business-id',
    dayOfWeek: 1,
    openTime: '09:00',
    closeTime: '17:00',
    isOpen: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test staff availability object
 */
export function createTestStaffAvailability(overrides: Partial<any> = {}) {
  return {
    id: 'test-staff-availability-id',
    staffId: 'test-staff-id',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    isAvailable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test time off request object
 */
export function createTestTimeOffRequest(overrides: Partial<any> = {}) {
  return {
    id: 'test-time-off-id',
    staffId: 'test-staff-id',
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    reason: 'Vacation',
    status: 'APPROVED',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test transaction object
 */
export function createTestTransaction(overrides: Partial<any> = {}) {
  return {
    id: 'test-transaction-id',
    appointmentId: 'test-appointment-id',
    amount: 50.0,
    type: 'PAYMENT',
    method: 'CARD',
    status: 'COMPLETED',
    stripePaymentIntentId: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test business user object
 */
export function createTestBusinessUser(overrides: Partial<any> = {}) {
  return {
    id: 'test-business-user-id',
    businessId: 'test-business-id',
    userId: 'test-user-id',
    role: 'MANAGER',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test session object
 */
export function createTestSession(overrides: Partial<any> = {}) {
  return {
    user: createTestUser(),
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

/**
 * Create multiple test objects
 */
export function createTestAppointments(count: number, overrides: Partial<any> = {}) {
  return Array.from({ length: count }, (_, i) =>
    createTestAppointment({ id: `test-appointment-${i}`, ...overrides })
  );
}

export function createTestClients(count: number, overrides: Partial<any> = {}) {
  return Array.from({ length: count }, (_, i) =>
    createTestClient({ id: `test-client-${i}`, ...overrides })
  );
}

export function createTestStaffMembers(count: number, overrides: Partial<any> = {}) {
  return Array.from({ length: count }, (_, i) =>
    createTestStaff({ id: `test-staff-${i}`, ...overrides })
  );
}

export function createTestServices(count: number, overrides: Partial<any> = {}) {
  return Array.from({ length: count }, (_, i) =>
    createTestService({ id: `test-service-${i}`, ...overrides })
  );
}

/**
 * Create a test dashboard appointment object with all required properties
 */
export function createTestDashboardAppointment(overrides: Partial<any> = {}) {
  const baseAppointment = createTestAppointment();
  
  return {
    id: baseAppointment.id,
    businessId: baseAppointment.businessId,
    clientId: baseAppointment.clientId,
    staffId: baseAppointment.staffId,
    startTime: baseAppointment.startTime,
    endTime: baseAppointment.endTime,
    status: baseAppointment.status,
    services: [
      {
        id: 'test-service-id',
        name: 'Test Service',
        duration: 60,
        price: 50.0,
      },
    ],
    totalPrice: 50.0,
    totalDuration: 60,
    notes: null,
    client: {
      id: baseAppointment.client.id,
      firstName: baseAppointment.client.firstName,
      lastName: baseAppointment.client.lastName,
      email: baseAppointment.client.email,
      phone: baseAppointment.client.phone,
      avatar: undefined,
    },
    staff: {
      id: baseAppointment.staff.id,
      firstName: baseAppointment.staff.displayName.split(' ')[0] || 'Test',
      lastName: baseAppointment.staff.displayName.split(' ')[1] || 'Staff',
      displayName: baseAppointment.staff.displayName,
      color: '#3B82F6',
    },
    isConflicted: false,
    canEdit: true,
    canCancel: true,
    canReschedule: true,
    lastUpdated: new Date(),
    updatedBy: undefined,
    ...overrides,
  };
}

/**
 * Create a test staff member object for dashboard
 */
export function createTestStaffMember(overrides: Partial<any> = {}) {
  return {
    id: 'test-staff-member-id',
    firstName: 'Test',
    lastName: 'Staff',
    displayName: 'Test Staff',
    avatar: undefined,
    specialties: ['Haircut', 'Styling'],
    color: '#3B82F6',
    isActive: true,
    role: 'Stylist',
    ...overrides,
  };
}

/**
 * Create multiple test dashboard appointments
 */
export function createTestDashboardAppointments(count: number, overrides: Partial<any> = {}) {
  return Array.from({ length: count }, (_, i) =>
    createTestDashboardAppointment({ id: `test-appointment-${i}`, ...overrides })
  );
}

/**
 * Create multiple test staff members
 */
export function createTestStaffMembersList(count: number, overrides: Partial<any> = {}) {
  return Array.from({ length: count }, (_, i) =>
    createTestStaffMember({ 
      id: `test-staff-member-${i}`,
      displayName: `Staff Member ${i}`,
      ...overrides 
    })
  );
}

/**
 * Create a test business hours entry for calendar
 */
export function createTestBusinessHoursEntry(overrides: Partial<any> = {}) {
  return {
    dayOfWeek: 1,
    openTime: '09:00',
    closeTime: '17:00',
    isClosed: false,
    ...overrides,
  };
}

/**
 * Create multiple test business hours entries (for a week)
 */
export function createTestBusinessHoursWeek() {
  return Array.from({ length: 7 }, (_, i) =>
    createTestBusinessHoursEntry({ dayOfWeek: i })
  );
}
