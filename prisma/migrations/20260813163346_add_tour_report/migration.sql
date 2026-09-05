-- CreateEnum
CREATE TYPE "TourReportStatus" AS ENUM ('SUBMITTED', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "durationDays" INTEGER,
ADD COLUMN     "pickupInfo" JSONB,
ADD COLUMN     "tourName" TEXT,
ADD COLUMN     "tourType" "TourType";

-- AlterTable
ALTER TABLE "Vehicle" ALTER COLUMN "capacity" SET DEFAULT 12;

-- CreateTable
CREATE TABLE "TourReport" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "submittedById" TEXT,
    "submittedByName" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualPax" INTEGER,
    "pickupNotes" TEXT,
    "distanceKm" DOUBLE PRECISION,
    "fuelCost" DECIMAL(65,30),
    "tollParking" DECIMAL(65,30),
    "notes" TEXT,
    "status" "TourReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    "verifiedById" TEXT,
    "verifiedByName" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verificationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TourReport_assignmentId_key" ON "TourReport"("assignmentId");

-- CreateIndex
CREATE INDEX "TourReport_status_idx" ON "TourReport"("status");

-- AddForeignKey
ALTER TABLE "TourReport" ADD CONSTRAINT "TourReport_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
