-- CreateEnum
CREATE TYPE "FeeFlowType" AS ENUM ('COLLECT_MONEY', 'PAY_MONEY');

-- AlterTable
ALTER TABLE "TourReport" ADD COLUMN     "moneyVerificationNote" TEXT,
ADD COLUMN     "moneyVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "moneyVerifiedById" TEXT,
ADD COLUMN     "moneyVerifiedByName" TEXT,
ADD COLUMN     "netAmount" DECIMAL(65,30),
ADD COLUMN     "settlementFlow" "FeeFlowType";

-- CreateTable
CREATE TABLE "SettlementCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flowType" "FeeFlowType" NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "note" TEXT,
    "assignmentId" TEXT,
    "bookingId" TEXT,
    "categoryId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reversesId" TEXT,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentPeriod" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "tourCount" INTEGER NOT NULL DEFAULT 0,
    "personReturnsToCompany" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "companyReturnsToPerson" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalNet" DECIMAL(65,30) NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentPeriodLine" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "payableToId" TEXT NOT NULL,
    "tourName" TEXT,
    "tourDate" TIMESTAMP(3) NOT NULL,
    "netAmount" DECIMAL(65,30) NOT NULL,
    "flow" "FeeFlowType" NOT NULL,
    "note" TEXT,

    CONSTRAINT "PaymentPeriodLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SettlementCategory_code_key" ON "SettlementCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_reversesId_key" ON "Settlement"("reversesId");

-- CreateIndex
CREATE INDEX "Settlement_assignmentId_idx" ON "Settlement"("assignmentId");

-- CreateIndex
CREATE INDEX "Settlement_bookingId_idx" ON "Settlement"("bookingId");

-- CreateIndex
CREATE INDEX "Settlement_categoryId_idx" ON "Settlement"("categoryId");

-- CreateIndex
CREATE INDEX "PaymentPeriod_personId_toDate_idx" ON "PaymentPeriod"("personId", "toDate");

-- CreateIndex
CREATE INDEX "PaymentPeriod_createdAt_idx" ON "PaymentPeriod"("createdAt");

-- CreateIndex
CREATE INDEX "PaymentPeriodLine_payableToId_idx" ON "PaymentPeriodLine"("payableToId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentPeriodLine_periodId_assignmentId_key" ON "PaymentPeriodLine"("periodId", "assignmentId");

-- CreateIndex
CREATE INDEX "TourReport_moneyVerifiedAt_idx" ON "TourReport"("moneyVerifiedAt");

-- AddForeignKey
ALTER TABLE "TourReport" ADD CONSTRAINT "TourReport_moneyVerifiedById_fkey" FOREIGN KEY ("moneyVerifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SettlementCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_reversesId_fkey" FOREIGN KEY ("reversesId") REFERENCES "Settlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPeriod" ADD CONSTRAINT "PaymentPeriod_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPeriodLine" ADD CONSTRAINT "PaymentPeriodLine_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "PaymentPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPeriodLine" ADD CONSTRAINT "PaymentPeriodLine_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPeriodLine" ADD CONSTRAINT "PaymentPeriodLine_payableToId_fkey" FOREIGN KEY ("payableToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
