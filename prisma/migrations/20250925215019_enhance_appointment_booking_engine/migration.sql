/*
  Warnings:

  - Added the required column `totalDuration` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalPrice` to the `appointments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "appointment_services" ADD COLUMN     "assignedStaffId" TEXT,
ADD COLUMN     "serviceOrder" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "startOffset" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- Add totalDuration with default value calculated from existing appointments
ALTER TABLE "appointments" ADD COLUMN "totalDuration" INTEGER;

-- Update totalDuration based on existing appointment services
UPDATE "appointments" 
SET "totalDuration" = COALESCE(
  (SELECT SUM(duration) FROM "appointment_services" WHERE "appointmentId" = "appointments"."id"),
  EXTRACT(EPOCH FROM ("endTime" - "startTime"))/60
);

-- Make totalDuration NOT NULL after setting values
ALTER TABLE "appointments" ALTER COLUMN "totalDuration" SET NOT NULL;

-- Add totalPrice with default value calculated from existing appointments
ALTER TABLE "appointments" ADD COLUMN "totalPrice" DECIMAL(10,2);

-- Update totalPrice based on existing appointment services
UPDATE "appointments" 
SET "totalPrice" = COALESCE(
  (SELECT SUM(price) FROM "appointment_services" WHERE "appointmentId" = "appointments"."id"),
  0.00
);

-- Make totalPrice NOT NULL after setting values
ALTER TABLE "appointments" ALTER COLUMN "totalPrice" SET NOT NULL;

-- CreateTable
CREATE TABLE "appointment_status_history" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "oldStatus" "AppointmentStatus",
    "newStatus" "AppointmentStatus" NOT NULL,
    "changedBy" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_preferences" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "preferredStaffId" TEXT,
    "preferredServices" TEXT[],
    "preferredTimeSlots" JSONB NOT NULL,
    "specialRequests" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_status_history_appointmentId_createdAt_idx" ON "appointment_status_history"("appointmentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_preferences_clientId_businessId_key" ON "appointment_preferences"("clientId", "businessId");

-- CreateIndex
CREATE INDEX "appointment_services_appointmentId_serviceOrder_idx" ON "appointment_services"("appointmentId", "serviceOrder");

-- CreateIndex
CREATE INDEX "appointments_businessId_status_idx" ON "appointments"("businessId", "status");

-- CreateIndex
CREATE INDEX "appointments_clientId_startTime_idx" ON "appointments"("clientId", "startTime");

-- AddForeignKey
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "appointment_status_history_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "appointment_status_history_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_preferences" ADD CONSTRAINT "appointment_preferences_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_preferences" ADD CONSTRAINT "appointment_preferences_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
