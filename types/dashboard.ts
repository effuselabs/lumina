export interface DashboardWidget {
  id: string;
  title: string;
  type: WidgetType;
  size: WidgetSize;
  position: WidgetPosition;
  config: WidgetConfig;
  isLoading?: boolean;
  error?: string;
}

export type WidgetType =
  | 'revenue-chart'
  | 'appointment-calendar'
  | 'client-metrics'
  | 'quick-stats'
  | 'recent-activity'
  | 'staff-performance'
  | 'service-analytics'
  | 'financial-summary';

export interface WidgetSize {
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetConfig {
  [key: string]: any;
  refreshInterval?: number;
  dateRange?: DateRange;
  filters?: WidgetFilters;
}

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

// Dashboard Layout
export interface DashboardLayout {
  id: string;
  name: string;
  businessId: string;
  userId: string;
  widgets: DashboardWidget[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
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

// Dashboard State
export interface DashboardState {
  currentLayout: DashboardLayout | null;
  availableLayouts: DashboardLayout[];
  isEditing: boolean;
  selectedDateRange: DateRange;
  globalFilters: WidgetFilters;
  isLoading: boolean;
  error: string | null;
}

// Widget Component Props
export interface WidgetComponentProps<T = any> {
  widget: DashboardWidget;
  data: T;
  isLoading: boolean;
  error?: string;
  onConfigChange: (config: WidgetConfig) => void;
  onResize?: (size: WidgetSize) => void;
  businessId: string;
}

// Chart Data Types
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
  category?: string;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'area' | 'pie' | 'donut';
  xAxisKey: string;
  yAxisKey: string;
  colorScheme: string[];
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  height?: number;
}
