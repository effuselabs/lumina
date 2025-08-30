-- Migration: Add Hybrid Employment Model Support
-- This migration adds support for hybrid business models with commission and chair rental

-- Create new enums for employment types
CREATE TYPE "EmploymentType" AS ENUM ('COMMISSION', 'CHAIR_RENTAL', 'HYBRID');
CREATE TYPE "RentalPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- Add new columns to staff table
ALTER TABLE "staff" 
ADD COLUMN "employment_type" "EmploymentType" NOT NULL DEFAULT 'COMMISSION',
ADD COLUMN "chair_rental_amount" DECIMAL(10,2),
ADD COLUMN "chair_rental_period" "RentalPeriod",
ADD COLUMN "base_salary" DECIMAL(10,2),
ADD COLUMN "start_date" DATE NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN "end_date" DATE;

-- Update existing staff to have commission employment type
UPDATE "staff" SET "employment_type" = 'COMMISSION' WHERE "commission_rate" IS NOT NULL;

-- Add indexes for performance
CREATE INDEX "staff_business_id_employment_type_idx" ON "staff"("business_id", "employment_type");
CREATE INDEX "staff_business_id_is_active_idx" ON "staff"("business_id", "is_active");

-- Add new columns to transactions table for employment type support
ALTER TABLE "transactions"
ADD COLUMN "staff_employment_type" "EmploymentType",
ADD COLUMN "chair_rental_applicable" BOOLEAN NOT NULL DEFAULT false;

-- Add index for transaction employment type queries
CREATE INDEX "transactions_business_id_staff_employment_type_idx" ON "transactions"("business_id", "staff_employment_type");

-- Create payment_calculations table
CREATE TABLE "payment_calculations" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "calculation_period_start" DATE NOT NULL,
    "calculation_period_end" DATE NOT NULL,
    "employment_type" "EmploymentType" NOT NULL,
    "gross_revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "commission_earnings" DECIMAL(10,2),
    "chair_rental_due" DECIMAL(10,2),
    "base_salary_amount" DECIMAL(10,2),
    "net_earnings" DECIMAL(10,2) NOT NULL,
    "business_retention" DECIMAL(10,2) NOT NULL,
    "calculation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_calculations_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "payment_calculations" ADD CONSTRAINT "payment_calculations_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_calculations" ADD CONSTRAINT "payment_calculations_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique constraint to prevent duplicate calculations
ALTER TABLE "payment_calculations" ADD CONSTRAINT "payment_calculations_staff_id_calculation_period_start_calculation_period_end_key" UNIQUE ("staff_id", "calculation_period_start", "calculation_period_end");

-- Add indexes for payment calculations
CREATE INDEX "payment_calculations_business_id_calculation_period_start_idx" ON "payment_calculations"("business_id", "calculation_period_start");
CREATE INDEX "payment_calculations_staff_id_calculation_period_start_idx" ON "payment_calculations"("staff_id", "calculation_period_start");
CREATE INDEX "payment_calculations_business_id_employment_type_idx" ON "payment_calculations"("business_id", "employment_type");

-- Add data validation constraints
ALTER TABLE "staff" ADD CONSTRAINT "staff_commission_rate_check" CHECK ("commission_rate" IS NULL OR ("commission_rate" >= 0 AND "commission_rate" <= 100));
ALTER TABLE "staff" ADD CONSTRAINT "staff_chair_rental_amount_check" CHECK ("chair_rental_amount" IS NULL OR "chair_rental_amount" >= 0);
ALTER TABLE "staff" ADD CONSTRAINT "staff_base_salary_check" CHECK ("base_salary" IS NULL OR "base_salary" >= 0);

-- Add employment type validation constraints
ALTER TABLE "staff" ADD CONSTRAINT "staff_commission_employment_check" 
CHECK (
  ("employment_type" = 'COMMISSION' AND "commission_rate" IS NOT NULL AND "chair_rental_amount" IS NULL AND "chair_rental_period" IS NULL) OR
  ("employment_type" = 'CHAIR_RENTAL' AND "chair_rental_amount" IS NOT NULL AND "chair_rental_period" IS NOT NULL AND "commission_rate" IS NULL AND "base_salary" IS NULL) OR
  ("employment_type" = 'HYBRID' AND "commission_rate" IS NOT NULL AND "chair_rental_amount" IS NOT NULL AND "chair_rental_period" IS NOT NULL)
);

-- Add payment calculation validation constraints
ALTER TABLE "payment_calculations" ADD CONSTRAINT "payment_calculations_gross_revenue_check" CHECK ("gross_revenue" >= 0);
ALTER TABLE "payment_calculations" ADD CONSTRAINT "payment_calculations_commission_earnings_check" CHECK ("commission_earnings" IS NULL OR "commission_earnings" >= 0);
ALTER TABLE "payment_calculations" ADD CONSTRAINT "payment_calculations_chair_rental_due_check" CHECK ("chair_rental_due" IS NULL OR "chair_rental_due" >= 0);
ALTER TABLE "payment_calculations" ADD CONSTRAINT "payment_calculations_base_salary_amount_check" CHECK ("base_salary_amount" IS NULL OR "base_salary_amount" >= 0);
ALTER TABLE "payment_calculations" ADD CONSTRAINT "payment_calculations_net_earnings_check" CHECK ("net_earnings" >= 0);
ALTER TABLE "payment_calculations" ADD CONSTRAINT "payment_calculations_business_retention_check" CHECK ("business_retention" >= 0);

-- Add period validation constraint
ALTER TABLE "payment_calculations" ADD CONSTRAINT "payment_calculations_period_check" CHECK ("calculation_period_start" <= "calculation_period_end");

-- Update existing transactions to set employment type based on staff
UPDATE "transactions" 
SET "staff_employment_type" = s."employment_type"
FROM "staff" s 
WHERE "transactions"."staff_id" = s."id" AND "transactions"."staff_id" IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE "payment_calculations" IS 'Tracks payment calculations for different employment types including commission, chair rental, and hybrid models';
COMMENT ON COLUMN "staff"."employment_type" IS 'Type of employment arrangement: commission, chair rental, or hybrid';
COMMENT ON COLUMN "staff"."chair_rental_amount" IS 'Fixed amount charged for chair rental (daily, weekly, or monthly)';
COMMENT ON COLUMN "staff"."chair_rental_period" IS 'Period for chair rental charges (daily, weekly, monthly)';
COMMENT ON COLUMN "staff"."base_salary" IS 'Optional base salary for commission employees';
COMMENT ON COLUMN "payment_calculations"."employment_type" IS 'Employment type at time of calculation';
COMMENT ON COLUMN "payment_calculations"."gross_revenue" IS 'Total revenue generated by staff member during period';
COMMENT ON COLUMN "payment_calculations"."commission_earnings" IS 'Commission earnings for commission-based staff';
COMMENT ON COLUMN "payment_calculations"."chair_rental_due" IS 'Chair rental amount due for rental-based staff';
COMMENT ON COLUMN "payment_calculations"."net_earnings" IS 'Net earnings after all deductions';
COMMENT ON COLUMN "payment_calculations"."business_retention" IS 'Amount retained by business after staff payments';