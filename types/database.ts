import type { Prisma } from '@prisma/client';

// ============================================================================
// EXTENDED TYPES WITH RELATIONS
// ============================================================================

// User with all relations
export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    businesses: {
      include: {
        business: true;
      };
    };
    staffProfile: {
      include: {
        business: true;
        services: {
          include: {
            service: true;
          };
        };
      };
    };
  };
}>;

// Business with essential relations
export type BusinessWithRelations = Prisma.BusinessGetPayload<{
  include: {
    users: {
      include: {
        user: true;
      };
    };
    staff: {
      include: {
        user: true;
        services: {
          include: {
            service: true;
          };
        };
      };
    };
    services: true;
    clients: true;
  };
}>;

// Staff with relations
export type StaffWithRelations = Prisma.StaffGetPayload<{
  include: {
    user: true;
    business: true;
    services: {
      include: {
        service: true;
      };
    };
    appointments: {
      include: {
        client: true;
        services: {
          include: {
            service: true;
          };
        };
      };
    };
    paymentCalculations: true;
  };
}>;

// Staff with payment calculations
export type StaffWithPaymentCalculations = Prisma.StaffGetPayload<{
  include: {
    user: true;
    business: true;
    paymentCalculations: {
      orderBy: {
        calculationPeriodStart: 'desc';
      };
    };
  };
}>;

// Appointment with full relations
export type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: {
    client: true;
    staff: {
      include: {
        user: true;
      };
    };
    services: {
      include: {
        service: true;
      };
    };
    transactions: true;
  };
}>;

// Service with staff relations
export type ServiceWithStaff = Prisma.ServiceGetPayload<{
  include: {
    staff: {
      include: {
        staff: {
          include: {
            user: true;
          };
        };
      };
    };
  };
}>;

// Transaction with relations
export type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: {
    appointment: {
      include: {
        client: true;
        services: {
          include: {
            service: true;
          };
        };
      };
    };
    staff: {
      include: {
        user: true;
      };
    };
  };
}>;

// Payment calculation with relations
export type PaymentCalculationWithRelations = Prisma.PaymentCalculationGetPayload<{
  include: {
    staff: {
      include: {
        user: true;
      };
    };
    business: true;
  };
}>;

// ============================================================================
// UTILITY TYPES
// ============================================================================

// Create types (without id, createdAt, updatedAt)
export type CreateUser = Omit<Prisma.UserCreateInput, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateBusiness = Omit<Prisma.BusinessCreateInput, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateStaff = Omit<Prisma.StaffCreateInput, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateService = Omit<Prisma.ServiceCreateInput, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateClient = Omit<Prisma.ClientCreateInput, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateAppointment = Omit<Prisma.AppointmentCreateInput, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateTransaction = Omit<Prisma.TransactionCreateInput, 'id' | 'createdAt' | 'updatedAt'>;
export type CreatePaymentCalculation = Omit<Prisma.PaymentCalculationCreateInput, 'id' | 'createdAt' | 'updatedAt'>;

// Update types (without id, createdAt, updatedAt)
export type UpdateUser = Omit<Prisma.UserUpdateInput, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateBusiness = Omit<Prisma.BusinessUpdateInput, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateStaff = Omit<Prisma.StaffUpdateInput, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateService = Omit<Prisma.ServiceUpdateInput, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateClient = Omit<Prisma.ClientUpdateInput, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateAppointment = Omit<Prisma.AppointmentUpdateInput, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateTransaction = Omit<Prisma.TransactionUpdateInput, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdatePaymentCalculation = Omit<Prisma.PaymentCalculationUpdateInput, 'id' | 'createdAt' | 'updatedAt'>;

// ============================================================================
// BUSINESS LOGIC TYPES
// ============================================================================

// Working hours structure
export interface WorkingHours {
  [key: string]: {
    isOpen: boolean;
    openTime: string; // HH:mm format
    closeTime: string; // HH:mm format
    breaks?: Array<{
      startTime: string;
      endTime: string;
    }>;
  };
}

// Operating hours structure for business
export interface OperatingHours extends WorkingHours {
  // Inherits all fields from WorkingHours
}

// Appointment booking data
export interface AppointmentBookingData {
  clientId?: string;
  staffId: string;
  serviceIds: string[];
  startTime: Date;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  notes?: string;
  depositAmount?: number;
}

// Financial summary
export interface FinancialSummary {
  totalRevenue: number;
  totalCommissions: number;
  totalTransactions: number;
  averageTicket: number;
  period: {
    start: Date;
    end: Date;
  };
}

// Staff performance metrics
export interface StaffPerformance {
  staffId: string;
  totalRevenue: number;
  totalCommissions: number;
  totalAppointments: number;
  averageTicket: number;
  clientRetentionRate: number;
  period: {
    start: Date;
    end: Date;
  };
}

// Availability slot
export interface AvailabilitySlot {
  startTime: Date;
  endTime: Date;
  staffId: string;
  isAvailable: boolean;
  conflictReason?: string;
}

// Business analytics
export interface BusinessAnalytics {
  revenue: FinancialSummary;
  appointments: {
    total: number;
    completed: number;
    cancelled: number;
    noShows: number;
  };
  clients: {
    total: number;
    new: number;
    returning: number;
  };
  staff: StaffPerformance[];
  topServices: Array<{
    serviceId: string;
    serviceName: string;
    bookings: number;
    revenue: number;
  }>;
  employmentTypes: {
    commission: number;
    chairRental: number;
    hybrid: number;
  };
}

// Enhanced staff performance with employment type
export interface EnhancedStaffPerformance extends StaffPerformance {
  employmentType: EmploymentType;
  commissionRate?: number;
  chairRentalAmount?: number;
  chairRentalPeriod?: ChairRentalPeriod;
  businessRetention: number;
}

// Employment type summary
export interface EmploymentTypeSummary {
  employmentType: EmploymentType;
  staffCount: number;
  totalRevenue: number;
  totalStaffEarnings: number;
  businessRetention: number;
  averageEarningsPerStaff: number;
}