-- AlterTable
ALTER TABLE "TourReport" ADD COLUMN     "moneyPayableToId" TEXT;

-- CreateIndex
CREATE INDEX "TourReport_moneyPayableToId_idx" ON "TourReport"("moneyPayableToId");

-- AddForeignKey
ALTER TABLE "TourReport" ADD CONSTRAINT "TourReport_moneyPayableToId_fkey" FOREIGN KEY ("moneyPayableToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: các tour đã verify trước khi có cột này mặc định là HDV
-- (trùng hành vi của verifyTourMoney: payableToId ?? guideId ?? driverId).
-- Những tour không còn HDV thì gán tài xế.
UPDATE "TourReport" tr
SET "moneyPayableToId" = COALESCE(a."guideId", a."driverId")
FROM "Assignment" a
WHERE a."id" = tr."assignmentId"
  AND tr."moneyVerifiedAt" IS NOT NULL
  AND tr."moneyPayableToId" IS NULL;
