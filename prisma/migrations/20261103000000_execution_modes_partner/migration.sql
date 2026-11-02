CREATE TYPE "AssignmentExecutionMode" AS ENUM ('COMPANY_GUIDED', 'COMPANY_DRIVER_ONLY', 'OUTSOURCED_PARTNER');
CREATE TYPE "PartnerHandoffStatus" AS ENUM ('DRAFT', 'HANDED_OFF', 'RETURNED', 'CLOSED');
CREATE TYPE "PartnerMoneyFlow" AS ENUM ('PARTNER_COLLECTS_AND_REMITS', 'COMPANY_PAYS_PARTNER');
CREATE TYPE "TourReportSource" AS ENUM ('GUIDE_REPORT', 'DRIVER_ONLY_DIRECT', 'OUTSOURCED_PARTNER');
CREATE TYPE "MoneyPayeeType" AS ENUM ('GUIDE', 'DRIVER', 'PARTNER');

ALTER TABLE "Tour" ADD COLUMN "requiresGuide" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "PartnerAgency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PartnerAgency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PartnerAgency_name_key" ON "PartnerAgency"("name");
CREATE INDEX "PartnerAgency_isActive_name_idx" ON "PartnerAgency"("isActive", "name");

ALTER TABLE "Assignment" ADD COLUMN "executionMode" "AssignmentExecutionMode" NOT NULL DEFAULT 'COMPANY_GUIDED';
ALTER TABLE "Assignment" ADD COLUMN "partnerId" TEXT;
ALTER TABLE "Assignment" ADD COLUMN "partnerStatus" "PartnerHandoffStatus";
ALTER TABLE "Assignment" ADD COLUMN "partnerContractRef" TEXT;
ALTER TABLE "Assignment" ADD COLUMN "partnerAmount" DECIMAL(14,2);
ALTER TABLE "Assignment" ADD COLUMN "partnerCurrency" TEXT DEFAULT 'VND';
ALTER TABLE "Assignment" ADD COLUMN "partnerMoneyFlow" "PartnerMoneyFlow";
ALTER TABLE "Assignment" ADD COLUMN "partnerConfirmedById" TEXT;
ALTER TABLE "Assignment" ADD COLUMN "partnerConfirmedByName" TEXT;
ALTER TABLE "Assignment" ADD COLUMN "partnerConfirmedAt" TIMESTAMP(3);
ALTER TABLE "Assignment" ADD COLUMN "partnerReturnedAt" TIMESTAMP(3);
ALTER TABLE "Assignment" ADD COLUMN "partnerReturnNote" TEXT;

ALTER TABLE "TourReport" ADD COLUMN "sourceType" "TourReportSource" NOT NULL DEFAULT 'GUIDE_REPORT';
ALTER TABLE "TourReport" ADD COLUMN "moneyPayeeType" "MoneyPayeeType";
ALTER TABLE "TourReport" ADD COLUMN "moneyPartnerId" TEXT;

CREATE INDEX "TourReport_sourceType_idx" ON "TourReport"("sourceType");

ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "PartnerAgency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TourReport" ADD CONSTRAINT "TourReport_moneyPartnerId_fkey" FOREIGN KEY ("moneyPartnerId") REFERENCES "PartnerAgency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Tour" SET "requiresGuide" = false WHERE "code" = 'TOUR-0003';

UPDATE "Assignment" a
SET "executionMode" = 'COMPANY_DRIVER_ONLY', "guideId" = NULL
WHERE a."status" NOT IN ('COMPLETED', 'CANCELED')
  AND EXISTS (
    SELECT 1
    FROM "Booking" b
    JOIN "Tour" t ON t."id" = b."tourId"
    WHERE b."assignmentId" = a."id" AND t."requiresGuide" = false
  );
