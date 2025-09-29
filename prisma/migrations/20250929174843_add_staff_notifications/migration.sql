/*
  Warnings:

  - Added the required column `firstName` to the `staff` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `staff` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "SecurityViolationType" AS ENUM ('UNAUTHORIZED_BUSINESS_ACCESS', 'INVALID_BUSINESS_CONTEXT', 'CROSS_TENANT_DATA_ACCESS', 'INSUFFICIENT_PERMISSIONS', 'RESOURCE_NOT_FOUND', 'INVALID_RESOURCE_OWNERSHIP', 'SUSPICIOUS_ACTIVITY', 'RATE_LIMIT_EXCEEDED');

-- CreateEnum
CREATE TYPE "StaffNotificationType" AS ENUM ('NEW_BOOKING', 'BOOKING_CANCELLED', 'BOOKING_MODIFIED', 'SCHEDULE_CHANGE', 'PAYMENT_RECEIVED', 'CLIENT_MESSAGE', 'SYSTEM_ALERT', 'REMINDER');

-- CreateEnum
CREATE TYPE "StaffNotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "noShowPolicy" TEXT,
ADD COLUMN     "preparationInstructions" TEXT;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "prerequisites" TEXT,
ADD COLUMN     "recommendations" TEXT;

-- AlterTable - Add columns with default values first
ALTER TABLE "staff" ADD COLUMN     "firstName" TEXT NOT NULL DEFAULT 'Unknown',
ADD COLUMN     "lastName" TEXT NOT NULL DEFAULT 'Staff';

-- Update existing staff records to use displayName for firstName/lastName
UPDATE "staff" 
SET 
  "firstName" = CASE 
    WHEN "displayName" LIKE '% %' THEN SPLIT_PART("displayName", ' ', 1)
    ELSE "displayName"
  END,
  "lastName" = CASE 
    WHEN "displayName" LIKE '% %' THEN SUBSTRING("displayName" FROM POSITION(' ' IN "displayName") + 1)
    ELSE 'Staff'
  END
WHERE "firstName" = 'Unknown' OR "lastName" = 'Staff';

-- CreateTable
CREATE TABLE "public_booking_configs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "advanceBookingDays" INTEGER NOT NULL DEFAULT 30,
    "minimumNoticeHours" INTEGER NOT NULL DEFAULT 2,
    "maxServicesPerBooking" INTEGER NOT NULL DEFAULT 3,
    "requirePhone" BOOLEAN NOT NULL DEFAULT true,
    "requireEmail" BOOLEAN NOT NULL DEFAULT true,
    "allowNotes" BOOLEAN NOT NULL DEFAULT true,
    "customDomain" TEXT,
    "brandColors" JSONB,
    "sendConfirmationEmail" BOOLEAN NOT NULL DEFAULT true,
    "sendReminderEmail" BOOLEAN NOT NULL DEFAULT true,
    "reminderHours" INTEGER NOT NULL DEFAULT 24,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_booking_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_logs" (
    "id" TEXT NOT NULL,
    "type" "SecurityViolationType" NOT NULL,
    "userId" TEXT,
    "businessId" TEXT,
    "resourceId" TEXT,
    "resourceType" TEXT NOT NULL,
    "attemptedAction" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_metrics" (
    "id" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "businessId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "performance_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_alerts" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_metrics" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_notifications" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "type" "StaffNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "priority" "StaffNotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "public_booking_configs_businessId_key" ON "public_booking_configs"("businessId");

-- CreateIndex
CREATE INDEX "security_logs_businessId_createdAt_idx" ON "security_logs"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "security_logs_userId_createdAt_idx" ON "security_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "security_logs_type_createdAt_idx" ON "security_logs"("type", "createdAt");

-- CreateIndex
CREATE INDEX "security_logs_severity_createdAt_idx" ON "security_logs"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "security_logs_resourceType_resourceId_idx" ON "security_logs"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "audit_logs_businessId_createdAt_idx" ON "audit_logs"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_resourceType_resourceId_idx" ON "audit_logs"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "performance_metrics_businessId_timestamp_idx" ON "performance_metrics"("businessId", "timestamp");

-- CreateIndex
CREATE INDEX "performance_metrics_operationType_timestamp_idx" ON "performance_metrics"("operationType", "timestamp");

-- CreateIndex
CREATE INDEX "performance_metrics_success_timestamp_idx" ON "performance_metrics"("success", "timestamp");

-- CreateIndex
CREATE INDEX "system_alerts_type_timestamp_idx" ON "system_alerts"("type", "timestamp");

-- CreateIndex
CREATE INDEX "system_alerts_severity_resolved_idx" ON "system_alerts"("severity", "resolved");

-- CreateIndex
CREATE INDEX "system_alerts_timestamp_idx" ON "system_alerts"("timestamp");

-- CreateIndex
CREATE INDEX "business_metrics_businessId_date_idx" ON "business_metrics"("businessId", "date");

-- CreateIndex
CREATE INDEX "business_metrics_type_date_idx" ON "business_metrics"("type", "date");

-- CreateIndex
CREATE UNIQUE INDEX "business_metrics_businessId_date_type_key" ON "business_metrics"("businessId", "date", "type");

-- CreateIndex
CREATE INDEX "staff_notifications_businessId_staffId_isRead_idx" ON "staff_notifications"("businessId", "staffId", "isRead");

-- CreateIndex
CREATE INDEX "staff_notifications_businessId_staffId_createdAt_idx" ON "staff_notifications"("businessId", "staffId", "createdAt");

-- CreateIndex
CREATE INDEX "staff_notifications_staffId_isRead_idx" ON "staff_notifications"("staffId", "isRead");

-- AddForeignKey
ALTER TABLE "public_booking_configs" ADD CONSTRAINT "public_booking_configs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_logs" ADD CONSTRAINT "security_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_logs" ADD CONSTRAINT "security_logs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_metrics" ADD CONSTRAINT "performance_metrics_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_metrics" ADD CONSTRAINT "business_metrics_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_notifications" ADD CONSTRAINT "staff_notifications_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_notifications" ADD CONSTRAINT "staff_notifications_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
