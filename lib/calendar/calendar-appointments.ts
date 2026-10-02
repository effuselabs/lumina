import { z } from 'zod';
import {
  AppointmentStatus,
  type DashboardAppointment,
} from '@/types/dashboard-appointments';

/**
 * One appointment as `GET /api/appointments` returns it — only the fields the
 * calendar reads. Prisma decimals arrive as strings; instants as ISO strings.
 */
const decimal = z.union([z.string(), z.number()]).transform(Number);

const apiAppointmentSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  clientId: z.string(),
  staffId: z.string(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  status: z.nativeEnum(AppointmentStatus),
  totalDuration: z.number(),
  totalPrice: decimal,
  notes: z.string().nullish(),
  updatedAt: z.coerce.date(),
  clientName: z.string().nullish(),
  clientEmail: z.string().nullish(),
  clientPhone: z.string().nullish(),
  client: z
    .object({
      id: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().nullish(),
      phone: z.string().nullish(),
    })
    .nullish(),
  staff: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    displayName: z.string().nullish(),
  }),
  services: z.array(
    z.object({
      serviceId: z.string(),
      serviceName: z.string(),
      price: decimal,
      duration: z.number(),
    })
  ),
});

const FINISHED = new Set<AppointmentStatus>([
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
]);

/** Parse one API appointment into what the calendar views render. */
export function toDashboardAppointment(
  raw: unknown,
  staffColour: string
): DashboardAppointment {
  const apt = apiAppointmentSchema.parse(raw);
  const open = !FINISHED.has(apt.status);
  return {
    id: apt.id,
    businessId: apt.businessId,
    clientId: apt.clientId,
    staffId: apt.staffId,
    startTime: apt.startTime,
    endTime: apt.endTime,
    status: apt.status,
    services: apt.services.map(service => ({
      id: service.serviceId,
      name: service.serviceName,
      duration: service.duration,
      price: service.price,
    })),
    totalPrice: apt.totalPrice,
    totalDuration: apt.totalDuration,
    notes: apt.notes ?? undefined,
    client: apt.client
      ? {
          id: apt.client.id,
          firstName: apt.client.firstName,
          lastName: apt.client.lastName,
          email: apt.client.email ?? '',
          phone: apt.client.phone ?? '',
        }
      : {
          // A booking keeps its own contact details for clients without a row.
          id: apt.clientId,
          firstName: apt.clientName ?? 'Client',
          lastName: '',
          email: apt.clientEmail ?? '',
          phone: apt.clientPhone ?? '',
        },
    staff: {
      id: apt.staff.id,
      firstName: apt.staff.firstName,
      lastName: apt.staff.lastName,
      displayName:
        apt.staff.displayName ?? `${apt.staff.firstName} ${apt.staff.lastName}`,
      color: staffColour,
    },
    isConflicted: false,
    canEdit: open,
    canCancel: open,
    canReschedule: open,
    lastUpdated: apt.updatedAt,
  };
}

/**
 * The instants a calendar view shows, as [start, end) in the browser's zone —
 * the zone the views lay their grids out in.
 */
export function visibleWindow(
  view: 'day' | 'week' | 'month',
  date: Date
): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let days = 1;
  if (view === 'week') {
    start.setDate(start.getDate() - start.getDay());
    days = 7;
  } else if (view === 'month') {
    // The month grid: six weeks from the Sunday on or before the 1st.
    start.setDate(1);
    start.setDate(1 - start.getDay());
    days = 42;
  }
  const end = new Date(start);
  end.setDate(start.getDate() + days);
  return { start, end };
}
