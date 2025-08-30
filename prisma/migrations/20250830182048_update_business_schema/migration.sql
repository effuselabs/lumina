/*
  Warnings:

  - You are about to drop the column `chairRental` on the `staff` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('COMMISSION', 'CHAIR_RENTAL', 'HYBRID');

-- CreateEnum
CREATE TYPE "RentalPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "staff" DROP COLUMN "chairRental",
ADD COLUMN     "baseSalary" DECIMAL(10,2),
ADD COLUMN     "chairRentalAmount" DECIMAL(10,2),
ADD COLUMN     "chairRentalPeriod" "RentalPeriod",
ADD COLUMN     "employmentType" "EmploymentType" NOT NULL DEFAULT 'COMMISSION',
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "chairRentalApplicable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "staffEmploymentType" "EmploymentType";

-- CreateTable
CREATE TABLE "payment_calculations" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "calculationPeriodStart" TIMESTAMP(3) NOT NULL,
    "calculationPeriodEnd" TIMESTAMP(3) NOT NULL,
    "employmentType" "EmploymentType" NOT NULL,
    "grossRevenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "commissionEarnings" DECIMAL(10,2),
    "chairRentalDue" DECIMAL(10,2),
    "baseSalaryAmount" DECIMAL(10,2),
    "netEarnings" DECIMAL(10,2) NOT NULL,
    "businessRetention" DECIMAL(10,2) NOT NULL,
    "calculationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_calculations_businessId_calculationPeriodStart_idx" ON "payment_calculations"("businessId", "calculationPeriodStart");

-- CreateIndex
CREATE INDEX "payment_calculations_staffId_calculationPeriodStart_idx" ON "payment_calculations"("staffId", "calculationPeriodStart");

-- CreateIndex
CREATE INDEX "payment_calculations_businessId_employmentType_idx" ON "payment_calculations"("businessId", "employmentType");

-- CreateIndex
CREATE UNIQUE INDEX "payment_calculations_staffId_calculationPeriodStart_calcula_key" ON "payment_calculations"("staffId", "calculationPeriodStart", "calculationPeriodEnd");

-- CreateIndex
CREATE INDEX "staff_businessId_employmentType_idx" ON "staff"("businessId", "employmentType");

-- CreateIndex
CREATE INDEX "staff_businessId_isActive_idx" ON "staff"("businessId", "isActive");

-- CreateIndex
CREATE INDEX "transactions_businessId_staffEmploymentType_idx" ON "transactions"("businessId", "staffEmploymentType");

-- AddForeignKey
ALTER TABLE "payment_calculations" ADD CONSTRAINT "payment_calculations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_calculations" ADD CONSTRAINT "payment_calculations_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
