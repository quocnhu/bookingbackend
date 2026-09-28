-- AlterTable
ALTER TABLE "TourReport" ADD COLUMN     "guidePaidAt" TIMESTAMP(3),
ADD COLUMN     "guidePaidById" TEXT,
ADD COLUMN     "guidePaidByName" TEXT;

-- CreateTable
CREATE TABLE "guide_payment_periods" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "tourCount" INTEGER NOT NULL DEFAULT 0,
    "guideReturnsToCompany" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "companyReturnsToGuide" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalNet" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guide_payment_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guide_payment_periods_guideId_createdAt_idx" ON "guide_payment_periods"("guideId", "createdAt");

-- CreateIndex
CREATE INDEX "TourReport_guidePaidAt_idx" ON "TourReport"("guidePaidAt");

-- AddForeignKey
ALTER TABLE "guide_payment_periods" ADD CONSTRAINT "guide_payment_periods_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
