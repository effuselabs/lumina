/**
 * Dashboard Integration Types
 *
 * Type definitions for the Dashboard Appointment Management integration layer.
 * Defines interfaces for system integrations, notifications, and data exchange.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 *
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { AppointmentStatus } from '@prisma/client';

// ============================================================================
// DASHBOARD APPOINTMENT DATA
// ============================================================================

export interface DashboardAppointmentData {
  // Base appointment data
  id: string;
  businessId: string;
  clientId: string | null;
  staffId: string;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  totalDuration: number;
  totalPrice: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Enhanced client data for dashboard display
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatar?: string;
  } | null;

  // Enhanced staff data for dashboard display
  staff: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    color: string; // For calendar color coding
  };

  // Services data
  services: Array<{
    id: string;
    name: string;
    duration: number;
    price: number;
    category?: string;
  }>;

  // Transactions data
  transactions: Array<{
    id: string;
    amount: number;
    type: string;
    status: string;
    createdAt: Date;
  }>;

  // Computed properties for dashboard functionality
  isConflicted: boolean;
  canEdit: boolean;
  canCancel: boolean;
  canReschedule: boolean;

  // Real-time status tracking
  lastUpdated: Date;
  updatedBy?: string;
}

// ============================================================================
// FILTERING AND SEARCH
// ============================================================================

export interface DashboardFilters {
  staffIds?: string[];
  serviceIds?: string[];
  status?: AppointmentStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  clientId?: string;
  searchTerm?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'startTime' | 'createdAt' | 'updatedAt';
  sortDirection?: 'asc' | 'desc';
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

// ============================================================================
// CALENDAR INTEGRATION
// ============================================================================

export interface CalendarSlot {
  startTime: Date;
  endTime: Date;
  staffId: string;
  isAvailable: boolean;
  appointments: DashboardAppointmentData[];
  conflicts: ConflictInfo[];
}

export interface ConflictInfo {
  type:
    'overlap' | 'staff_unavailable' | 'business_closed' | 'service_conflict';
  severity: 'warning' | 'error';
  message: string;
  affectedAppointments: string[];
  suggestedAlternatives?: TimeSlotAlternative[];
}

export interface TimeSlotAlternative {
  startTime: Date;
  endTime: Date;
  staffId: string;
  staffName: string;
  confidence: number; // 0-1 score for how good this alternative is
}

export interface StaffAvailabilityData {
  staffId: string;
  availableSlots: CalendarSlot[];
  busySlots: CalendarSlot[];
  workingHours: WorkingHoursData;
  breaks: BreakData[];
  timeOff: TimeOffData[];
}

export interface WorkingHoursData {
  [dayOfWeek: number]: {
    isWorking: boolean;
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
  };
}

export interface BreakData {
  id: string;
  startTime: Date;
  endTime: Date;
  type: 'lunch' | 'break' | 'appointment_gap';
  isRecurring: boolean;
}

export interface TimeOffData {
  id: string;
  startDate: Date;
  endDate: Date;
  type: 'vacation' | 'sick' | 'personal' | 'training';
  status: 'approved' | 'pending' | 'denied';
}

// ============================================================================
// CLIENT INTEGRATION
// ============================================================================

export interface DashboardClientData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar?: string;
  appointmentHistory: ClientAppointmentHistory[];
  preferences: ClientPreferences;
  loyaltyInfo?: ClientLoyaltyInfo;
  lastVisit?: Date;
  totalVisits: number;
  totalSpent: number;
  averageTicket: number;
}

export interface ClientAppointmentHistory {
  id: string;
  date: Date;
  services: string[];
  staffName: string;
  status: AppointmentStatus;
  totalPrice: number;
  duration: number;
  notes?: string;
}

export interface ClientPreferences {
  preferredStaffId?: string;
  preferredServices: string[];
  preferredTimeSlots: PreferredTimeSlot[];
  communicationPreferences: {
    email: boolean;
    sms: boolean;
    phone: boolean;
  };
  specialRequests?: string;
}

export interface PreferredTimeSlot {
  dayOfWeek: number; // 0-6, Sunday = 0
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

export interface ClientLoyaltyInfo {
  programId: string;
  currentPoints: number;
  tierLevel: string;
  nextTierPoints: number;
  availableRewards: LoyaltyReward[];
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  type: 'discount' | 'free_service' | 'upgrade';
}

// ============================================================================
// SERVICE INTEGRATION
// ============================================================================

export interface DashboardServiceData {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  category?: string;
  staffIds: string[];
  isActive: boolean;
  isOnline: boolean;
  prerequisites?: string;
  recommendations?: string;
  bookingSettings: ServiceBookingSettings;
  performanceMetrics?: ServicePerformanceMetrics;
}

export interface ServiceBookingSettings {
  requiresDeposit: boolean;
  depositAmount?: number;
  advanceBookingDays: number;
  cancellationPolicy?: string;
  preparationInstructions?: string;
  allowOnlineBooking: boolean;
}

export interface ServicePerformanceMetrics {
  totalBookings: number;
  averageRating: number;
  revenue: number;
  popularityRank: number;
  seasonalTrends: SeasonalTrend[];
}

export interface SeasonalTrend {
  month: number;
  bookings: number;
  revenue: number;
}

// ============================================================================
// STAFF INTEGRATION
// ============================================================================

export interface DashboardStaffData {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  color: string;
  isActive: boolean;
  services: string[];
  workingHours: WorkingHoursData;
  permissions: StaffPermissions;
  performanceMetrics?: StaffPerformanceMetrics;
  availability: StaffAvailabilityData;
}

export interface StaffPermissions {
  canEdit: boolean;
  canCancel: boolean;
  canReschedule: boolean;
  canViewAllAppointments: boolean;
  canManageClients: boolean;
  canAccessReports: boolean;
}

export interface StaffPerformanceMetrics {
  totalAppointments: number;
  completionRate: number;
  averageRating: number;
  revenue: number;
  clientRetentionRate: number;
  averageServiceTime: number;
  punctualityScore: number;
}

// ============================================================================
// NOTIFICATION INTEGRATION
// ============================================================================

export interface NotificationConfiguration {
  enabled: boolean;
  channels: {
    realTime: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  triggers: {
    appointmentCreated: boolean;
    appointmentUpdated: boolean;
    appointmentCancelled: boolean;
    appointmentReminder: boolean;
    statusChanged: boolean;
  };
  templates: NotificationTemplateSet;
}

export interface NotificationTemplateSet {
  appointmentCreated: NotificationTemplate;
  appointmentUpdated: NotificationTemplate;
  appointmentCancelled: NotificationTemplate;
  appointmentReminder: NotificationTemplate;
  statusChanged: NotificationTemplate;
}

export interface NotificationTemplate {
  subject: string;
  emailHtml: string;
  emailText: string;
  smsText: string;
  pushTitle: string;
  pushBody: string;
}

export interface NotificationRecipient {
  id: string;
  type: 'staff' | 'client' | 'business_owner';
  email?: string;
  phone?: string;
  name: string;
  preferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
    realTime: boolean;
  };
}

export interface NotificationResult {
  success: boolean;
  sentChannels: string[];
  failedChannels: string[];
  errors: string[];
  deliveryStatus?: {
    email?: 'sent' | 'delivered' | 'failed';
    sms?: 'sent' | 'delivered' | 'failed';
    push?: 'sent' | 'delivered' | 'failed';
    realTime?: 'sent' | 'delivered' | 'failed';
  };
}

// ============================================================================
// REAL-TIME INTEGRATION
// ============================================================================

export interface RealTimeUpdate {
  type:
    | 'appointment_created'
    | 'appointment_updated'
    | 'appointment_cancelled'
    | 'appointment_rescheduled'
    | 'status_changed';
  appointmentId: string;
  businessId: string;
  staffId: string;
  clientId?: string;
  data: Record<string, any>;
  timestamp: Date;
  userId?: string; // Who made the change
}

export interface RealTimeSubscription {
  id: string;
  businessId: string;
  staffId?: string;
  clientId?: string;
  filters?: DashboardFilters;
  callback: (update: RealTimeUpdate) => void;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: Date;
  messageId: string;
}

// ============================================================================
// SYSTEM HEALTH AND MONITORING
// ============================================================================

export interface SystemIntegrationStatus {
  appointmentBookingEngine: boolean;
  calendarInfrastructure: boolean;
  clientManagement: boolean;
  serviceManagement: boolean;
  staffManagement: boolean;
  notificationSystem: boolean;
  realTimeSync: boolean;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  systems: {
    [key: string]: SystemStatus;
  };
  lastChecked: Date;
}

export interface SystemStatus {
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  responseTime?: number;
  lastError?: string;
  lastChecked: Date;
  uptime?: number;
  errorRate?: number;
}

export interface IntegrationMetrics {
  appointmentOperations: {
    created: number;
    updated: number;
    cancelled: number;
    errors: number;
  };
  notificationsSent: {
    realTime: number;
    email: number;
    sms: number;
    push: number;
    failed: number;
  };
  systemPerformance: {
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
  };
  period: {
    start: Date;
    end: Date;
  };
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface DashboardApiResponse<T> {
  success: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
  metadata?: {
    total?: number;
    hasMore?: boolean;
    nextOffset?: number;
    responseTime?: number;
  };
}

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
  warnings: string[];
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface DashboardConfiguration {
  businessId: string;
  features: {
    realTimeUpdates: boolean;
    dragAndDrop: boolean;
    bulkOperations: boolean;
    advancedFilters: boolean;
    notifications: boolean;
    mobileOptimization: boolean;
  };
  display: {
    defaultView: 'day' | 'week' | 'month';
    timeFormat: '12h' | '24h';
    dateFormat: string;
    timezone: string;
    colorScheme: 'light' | 'dark' | 'auto';
  };
  permissions: {
    canCreateAppointments: boolean;
    canEditAppointments: boolean;
    canCancelAppointments: boolean;
    canViewAllStaff: boolean;
    canManageClients: boolean;
    canAccessReports: boolean;
  };
  integrations: {
    calendar: boolean;
    notifications: boolean;
    analytics: boolean;
    reporting: boolean;
  };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface IntegrationError extends Error {
  code: string;
  system: string;
  details?: Record<string, any>;
  retryable: boolean;
}

export interface ValidationError extends Error {
  field: string;
  value: any;
  constraint: string;
}

export interface ConflictError extends Error {
  conflictType: 'time_overlap' | 'staff_unavailable' | 'service_conflict';
  conflictingItems: string[];
  suggestions?: string[];
}
