-- Add BusinessHours model
CREATE TABLE "business_hours" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "day_of_week" TEXT NOT NULL,
    "open_time" TEXT NOT NULL,
    "close_time" TEXT NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_hours_pkey" PRIMARY KEY ("id")
);

-- Add PublicBookingConfig model
CREATE TABLE "public_booking_configs" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "advance_booking_days" INTEGER NOT NULL DEFAULT 30,
    "minimum_notice_hours" INTEGER NOT NULL DEFAULT 2,
    "max_services_per_booking" INTEGER NOT NULL DEFAULT 3,
    "require_phone" BOOLEAN NOT NULL DEFAULT true,
    "require_email" BOOLEAN NOT NULL DEFAULT true,
    "allow_notes" BOOLEAN NOT NULL DEFAULT true,
    "custom_domain" TEXT,
    "brand_colors" JSONB,
    "send_confirmation_email" BOOLEAN NOT NULL DEFAULT true,
    "send_reminder_email" BOOLEAN NOT NULL DEFAULT true,
    "reminder_hours" INTEGER NOT NULL DEFAULT 24,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_booking_configs_pkey" PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX "business_hours_business_id_idx" ON "business_hours"("business_id");
CREATE INDEX "business_hours_day_of_week_idx" ON "business_hours"("day_of_week");
CREATE UNIQUE INDEX "business_hours_business_id_day_of_week_key" ON "business_hours"("business_id", "day_of_week");

CREATE UNIQUE INDEX "public_booking_configs_business_id_key" ON "public_booking_configs"("business_id");

-- Add foreign key constraints
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public_booking_configs" ADD CONSTRAINT "public_booking_configs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add missing fields to Business model
ALTER TABLE "businesses" ADD COLUMN "cancellation_policy" TEXT;
ALTER TABLE "businesses" ADD COLUMN "no_show_policy" TEXT;
ALTER TABLE "businesses" ADD COLUMN "preparation_instructions" TEXT;