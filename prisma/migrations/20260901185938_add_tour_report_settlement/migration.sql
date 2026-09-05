-- AlterTable
ALTER TABLE "TourReport" ADD COLUMN     "collectedAmount" DECIMAL(65,30),
ADD COLUMN     "finalizedAt" TIMESTAMP(3),
ADD COLUMN     "finalizedById" TEXT,
ADD COLUMN     "finalizedByName" TEXT,
ADD COLUMN     "netAmount" DECIMAL(65,30),
ADD COLUMN     "services" JSONB,
ADD COLUMN     "servicesTotal" DECIMAL(65,30),
ADD COLUMN     "settlementFlow" "FeeFlowType";

-- CreateIndex
CREATE INDEX "TourReport_finalizedAt_idx" ON "TourReport"("finalizedAt");
