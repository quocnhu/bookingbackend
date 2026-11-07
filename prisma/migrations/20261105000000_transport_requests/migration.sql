-- CreateEnum
CREATE TYPE "TransportRequestStatus" AS ENUM ('NOT_REQUIRED', 'REQUESTED', 'VIEWED', 'ASSIGNED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProviderAssignmentMode" AS ENUM ('MANUAL', 'AUTO_SUGGEST', 'FULLY_AUTO');

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "providerAssignedById" TEXT,
ADD COLUMN     "providerDeadline" TIMESTAMP(3),
ADD COLUMN     "providerDeclineReason" TEXT,
ADD COLUMN     "providerRequestNote" TEXT,
ADD COLUMN     "providerRequestStatus" "TransportRequestStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "providerRequestedAt" TIMESTAMP(3),
ADD COLUMN     "providerRequestedById" TEXT,
ADD COLUMN     "providerRespondedAt" TIMESTAMP(3),
ADD COLUMN     "providerResponseNote" TEXT,
ADD COLUMN     "providerViewedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TransportationProvider" ADD COLUMN     "assignmentMode" "ProviderAssignmentMode" NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE INDEX "Assignment_providerId_providerRequestStatus_idx" ON "Assignment"("providerId", "providerRequestStatus");

-- CreateIndex
CREATE INDEX "Assignment_providerRequestStatus_providerDeadline_idx" ON "Assignment"("providerRequestStatus", "providerDeadline");
