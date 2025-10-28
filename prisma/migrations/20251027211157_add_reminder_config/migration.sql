-- CreateTable
CREATE TABLE "reminder_configs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "enable24hReminders" BOOLEAN NOT NULL DEFAULT true,
    "enable2hReminders" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "customReminderTimes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminder_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reminder_configs_businessId_key" ON "reminder_configs"("businessId");

-- CreateIndex
CREATE INDEX "reminder_configs_businessId_idx" ON "reminder_configs"("businessId");

-- AddForeignKey
ALTER TABLE "reminder_configs" ADD CONSTRAINT "reminder_configs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
