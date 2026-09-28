-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'LEAVE_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'LEAVE_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'LEAVE_REJECTED';

-- DropForeignKey
ALTER TABLE "RoutePrice" DROP CONSTRAINT "RoutePrice_vehicleId_fkey";

-- DropIndex
DROP INDEX "UserLeave_reviewedById_idx";

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "reportVerifierId" TEXT;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "movedFromBusId" TEXT;

-- AlterTable
ALTER TABLE "CompanyProfile" ADD COLUMN     "rootLatitude" DOUBLE PRECISION,
ADD COLUMN     "rootLongitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "TourReport" ALTER COLUMN "refundedAmount" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "TourTypePrice" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserLeave" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "brand" TEXT;

-- AddForeignKey
ALTER TABLE "RoutePrice" ADD CONSTRAINT "RoutePrice_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_movedFromBusId_fkey" FOREIGN KEY ("movedFromBusId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_reportVerifierId_fkey" FOREIGN KEY ("reportVerifierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
