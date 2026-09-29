export interface WidgetFilters {
  staffIds?: string[];
  serviceIds?: string[];
  clientIds?: string[];
  dateRange?: DateRange;
  employmentTypes?: string[];
}

export interface DateRange {
  from: Date;
  to: Date;
}

// Revenue Analytics
export interface RevenueData {
  date: string;
  revenue: number;
  appointments: number;
  averageTicket: number;
  commissionEarnings: number;
  chairRentalRevenue: number;
  businessRetention: number;
}

export interface RevenueMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  averageTicket: number;
  ticketGrowth: number;
  appointmentCount: number;
  appointmentGrowth: number;
  conversionRate: number;
}

// Client Analytics
export interface ClientMetrics {
  totalClients: number;
  newClients: number;
  returningClients: number;
  clientRetentionRate: number;
  averageLifetimeValue: number;
  clientGrowthRate: number;
  topClients: TopClient[];
}

export interface TopClient {
  id: string;
  name: string;
  email: string;
  totalSpent: number;
  appointmentCount: number;
  lastVisit: Date;
}

// Staff Performance
export interface StaffPerformance {
  staffId: string;
  name: string;
  employmentType: string;
  totalRevenue: number;
  appointmentCount: number;
  averageTicket: number;
  commissionEarnings: number;
  chairRentalPaid: number;
  utilizationRate: number;
  clientSatisfaction: number;
}

// Service Analytics
export interface ServiceAnalytics {
  serviceId: string;
  name: string;
  bookingCount: number;
  revenue: number;
  averagePrice: number;
  popularityRank: number;
  profitMargin: number;
  duration: number;
}

// Appointment Data
export interface AppointmentSummary {
  id: string;
  clientName: string;
  serviceName: string;
  staffName: string;
  startTime: Date;
  endTime: Date;
  status: string;
  totalAmount: number;
  notes?: string;
}
