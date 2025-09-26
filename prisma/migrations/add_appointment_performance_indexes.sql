-- Appointment Performance Optimization Indexes
-- 
-- This migration adds optimized database indexes for appointment queries
-- to achieve sub-500ms performance targets for all appointment operations.
-- 
-- Requirements: 6.1, 6.2, 6.3, 6.4

-- ============================================================================
-- CORE APPOINTMENT INDEXES
-- ============================================================================

-- Primary business context index (most important for multi-tenant queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_business_start_time 
ON appointments(business_id, start_time DESC);

-- Staff scheduling index (for staff appointment queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_staff_start_time 
ON appointments(business_id, staff_id, start_time DESC);

-- Client appointment history index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_client_start_time 
ON appointments(business_id, client_id, start_time DESC);

-- Status-based queries index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_business_status_start_time 
ON appointments(business_id, status, start_time DESC);

-- ============================================================================
-- CONFLICT DETECTION INDEXES
-- ============================================================================

-- Optimized conflict detection index (covers time range queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_conflict_detection 
ON appointments(business_id, staff_id, status, start_time, end_time)
WHERE status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS');

-- Time range overlap queries (for availability checking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_time_overlap 
ON appointments(staff_id, start_time, end_time)
WHERE status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS');

-- ============================================================================
-- APPOINTMENT SERVICES INDEXES
-- ============================================================================

-- Service order index for multi-service appointments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointment_services_order 
ON appointment_services(appointment_id, service_order ASC);

-- Service lookup index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointment_services_service_id 
ON appointment_services(service_id, appointment_id);

-- Staff assignment index for multi-service appointments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointment_services_assigned_staff 
ON appointment_services(assigned_staff_id, appointment_id)
WHERE assigned_staff_id IS NOT NULL;

-- ============================================================================
-- STATUS HISTORY INDEXES
-- ============================================================================

-- Status history lookup index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointment_status_history_appointment 
ON appointment_status_history(appointment_id, created_at DESC);

-- Business status history index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointment_status_history_business 
ON appointment_status_history(business_id, created_at DESC);

-- ============================================================================
-- SEARCH AND FILTERING INDEXES
-- ============================================================================

-- Client search index (for walk-in appointments)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_client_name_search 
ON appointments(business_id, client_name)
WHERE client_name IS NOT NULL;

-- Client email search index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_client_email_search 
ON appointments(business_id, client_email)
WHERE client_email IS NOT NULL;

-- Client phone search index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_client_phone_search 
ON appointments(business_id, client_phone)
WHERE client_phone IS NOT NULL;

-- ============================================================================
-- ANALYTICS AND REPORTING INDEXES
-- ============================================================================

-- Revenue analytics index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_revenue_analytics 
ON appointments(business_id, start_time, status, total_price)
WHERE status = 'COMPLETED';

-- Staff performance index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_staff_performance 
ON appointments(business_id, staff_id, start_time, status, total_price)
WHERE status = 'COMPLETED';

-- Daily/weekly/monthly reporting index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_date_reporting 
ON appointments(business_id, DATE(start_time), status);

-- ============================================================================
-- PARTIAL INDEXES FOR ACTIVE APPOINTMENTS
-- ============================================================================

-- Active appointments only (excludes cancelled/completed for scheduling queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_active_scheduling 
ON appointments(business_id, staff_id, start_time, end_time)
WHERE status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS');

-- Upcoming appointments index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_upcoming 
ON appointments(business_id, start_time)
WHERE status IN ('SCHEDULED', 'CONFIRMED') AND start_time > NOW();

-- ============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Full appointment search index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_full_search 
ON appointments(business_id, staff_id, client_id, status, start_time DESC);

-- Appointment management index (covers most admin queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_management 
ON appointments(business_id, status, start_time DESC, staff_id, client_id);

-- ============================================================================
-- FOREIGN KEY PERFORMANCE INDEXES
-- ============================================================================

-- Ensure foreign key lookups are fast
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_business_fk 
ON appointments(business_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_staff_fk 
ON appointments(staff_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_client_fk 
ON appointments(client_id)
WHERE client_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_user_fk 
ON appointments(user_id)
WHERE user_id IS NOT NULL;

-- ============================================================================
-- CLEANUP OLD INDEXES (if any exist with different names)
-- ============================================================================

-- Drop any existing indexes that might conflict or be redundant
-- (This is safe because we're using IF NOT EXISTS above)

-- Note: In production, you would want to check for existing indexes first
-- and drop them carefully to avoid downtime

-- ============================================================================
-- INDEX STATISTICS UPDATE
-- ============================================================================

-- Update table statistics for query planner optimization
ANALYZE appointments;
ANALYZE appointment_services;
ANALYZE appointment_status_history;

-- ============================================================================
-- PERFORMANCE VALIDATION QUERIES
-- ============================================================================

-- These queries can be used to validate index usage and performance
-- Run with EXPLAIN (ANALYZE, BUFFERS) to check execution plans

/*
-- Test business appointment query
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM appointments 
WHERE business_id = 'test_business_id' 
ORDER BY start_time DESC 
LIMIT 50;

-- Test staff scheduling query
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM appointments 
WHERE business_id = 'test_business_id' 
  AND staff_id = 'test_staff_id' 
  AND start_time >= NOW() 
  AND start_time <= NOW() + INTERVAL '7 days'
ORDER BY start_time ASC;

-- Test conflict detection query
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM appointments 
WHERE business_id = 'test_business_id' 
  AND staff_id = 'test_staff_id' 
  AND status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS')
  AND (
    (start_time >= '2024-01-01 10:00:00' AND start_time < '2024-01-01 11:00:00') OR
    (end_time > '2024-01-01 10:00:00' AND end_time <= '2024-01-01 11:00:00') OR
    (start_time <= '2024-01-01 10:00:00' AND end_time >= '2024-01-01 11:00:00')
  );

-- Test appointment statistics query
EXPLAIN (ANALYZE, BUFFERS) 
SELECT status, COUNT(*), SUM(total_price) 
FROM appointments 
WHERE business_id = 'test_business_id' 
  AND start_time >= '2024-01-01' 
  AND start_time < '2024-02-01' 
GROUP BY status;
*/