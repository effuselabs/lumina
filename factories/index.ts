// Mock data factories for consistent test data generation

export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'staff' | 'admin';
  businessId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockBusiness {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  financialModel: 'commission' | 'chair_rental';
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockService {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number; // in cents
  businessId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  businessId: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockAppointment {
  id: string;
  clientId: string;
  serviceId: string;
  staffId: string;
  businessId: string;
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Factory functions
let userIdCounter = 1;
let businessIdCounter = 1;
let serviceIdCounter = 1;
let clientIdCounter = 1;
let appointmentIdCounter = 1;

export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => {
  const id = `user-${userIdCounter++}`;
  const now = new Date();

  return {
    id,
    email: `user${userIdCounter}@example.com`,
    name: `Test User ${userIdCounter}`,
    role: 'owner',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

export const createMockBusiness = (
  overrides: Partial<MockBusiness> = {}
): MockBusiness => {
  const id = `business-${businessIdCounter++}`;
  const now = new Date();

  return {
    id,
    name: `Test Salon ${businessIdCounter}`,
    email: `salon${businessIdCounter}@example.com`,
    phone: `(555) 123-${String(businessIdCounter).padStart(4, '0')}`,
    address: `${businessIdCounter}23 Main St`,
    city: 'Test City',
    state: 'CA',
    zipCode: '90210',
    financialModel: 'commission',
    ownerId: `user-${businessIdCounter}`,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

export const createMockService = (
  overrides: Partial<MockService> = {}
): MockService => {
  const id = `service-${serviceIdCounter++}`;
  const now = new Date();

  const services = [
    { name: 'Haircut', duration: 60, price: 5000 },
    { name: 'Hair Color', duration: 120, price: 12000 },
    { name: 'Beard Trim', duration: 30, price: 2500 },
    { name: 'Shampoo & Style', duration: 45, price: 3500 },
    { name: 'Highlights', duration: 180, price: 15000 },
  ];

  const service = services[(serviceIdCounter - 1) % services.length];

  return {
    id,
    name: service.name,
    description: `Professional ${service.name.toLowerCase()} service`,
    duration: service.duration,
    price: service.price,
    businessId: `business-${serviceIdCounter}`,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

export const createMockClient = (
  overrides: Partial<MockClient> = {}
): MockClient => {
  const id = `client-${clientIdCounter++}`;
  const now = new Date();

  const firstNames = [
    'John',
    'Jane',
    'Mike',
    'Sarah',
    'David',
    'Lisa',
    'Chris',
    'Emma',
  ];
  const lastNames = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
  ];

  const firstName = firstNames[(clientIdCounter - 1) % firstNames.length];
  const lastName = lastNames[(clientIdCounter - 1) % lastNames.length];

  return {
    id,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    phone: `(555) 987-${String(clientIdCounter).padStart(4, '0')}`,
    businessId: `business-${clientIdCounter}`,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

export const createMockAppointment = (
  overrides: Partial<MockAppointment> = {}
): MockAppointment => {
  const id = `appointment-${appointmentIdCounter++}`;
  const now = new Date();
  const startTime = new Date(
    now.getTime() + appointmentIdCounter * 24 * 60 * 60 * 1000
  ); // Future dates
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later

  return {
    id,
    clientId: `client-${appointmentIdCounter}`,
    serviceId: `service-${appointmentIdCounter}`,
    staffId: `user-${appointmentIdCounter}`,
    businessId: `business-${appointmentIdCounter}`,
    startTime,
    endTime,
    status: 'scheduled',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

// Batch creation helpers
export const createMockUsers = (
  count: number,
  overrides: Partial<MockUser> = {}
): MockUser[] => {
  return Array.from({ length: count }, () => createMockUser(overrides));
};

export const createMockBusinesses = (
  count: number,
  overrides: Partial<MockBusiness> = {}
): MockBusiness[] => {
  return Array.from({ length: count }, () => createMockBusiness(overrides));
};

export const createMockServices = (
  count: number,
  overrides: Partial<MockService> = {}
): MockService[] => {
  return Array.from({ length: count }, () => createMockService(overrides));
};

export const createMockClients = (
  count: number,
  overrides: Partial<MockClient> = {}
): MockClient[] => {
  return Array.from({ length: count }, () => createMockClient(overrides));
};

export const createMockAppointments = (
  count: number,
  overrides: Partial<MockAppointment> = {}
): MockAppointment[] => {
  return Array.from({ length: count }, () => createMockAppointment(overrides));
};

// Complete business setup factory
export const createCompleteBusinessSetup = () => {
  const owner = createMockUser({ role: 'owner' });
  const business = createMockBusiness({ ownerId: owner.id });
  const services = createMockServices(3, { businessId: business.id });
  const clients = createMockClients(5, { businessId: business.id });
  const staff = createMockUsers(2, { role: 'staff', businessId: business.id });

  const appointments = createMockAppointments(10, {
    businessId: business.id,
    serviceId: services[0]?.id || 'default-service-id',
    clientId: clients[0]?.id || 'default-client-id',
    staffId: staff[0]?.id || 'default-staff-id',
  });

  return {
    owner,
    business,
    services,
    clients,
    staff,
    appointments,
  };
};

// Reset counters for consistent testing
export const resetFactoryCounters = () => {
  userIdCounter = 1;
  businessIdCounter = 1;
  serviceIdCounter = 1;
  clientIdCounter = 1;
  appointmentIdCounter = 1;
};
