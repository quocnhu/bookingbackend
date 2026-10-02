-- DropForeignKey
ALTER TABLE "Settlement" DROP CONSTRAINT "Settlement_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "Settlement" DROP CONSTRAINT "Settlement_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "Settlement" DROP CONSTRAINT "Settlement_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Settlement" DROP CONSTRAINT "Settlement_createdById_fkey";

-- DropForeignKey
ALTER TABLE "guide_payment_periods" DROP CONSTRAINT "guide_payment_periods_guideId_fkey";

-- DropIndex
DROP INDEX "TourReport_guidePaidAt_idx";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "collectAmount",
DROP COLUMN "refundAmount";

-- AlterTable
ALTER TABLE "TourReport" DROP COLUMN "collectedAmount",
DROP COLUMN "guidePaidAt",
DROP COLUMN "guidePaidById",
DROP COLUMN "guidePaidByName",
DROP COLUMN "netAmount",
DROP COLUMN "refundedAmount",
DROP COLUMN "services",
DROP COLUMN "servicesTotal",
DROP COLUMN "settlementFlow";

-- DropTable
DROP TABLE "Settlement";

-- DropTable
DROP TABLE "SettlementCategory";

-- DropTable
DROP TABLE "guide_payment_periods";

-- DropEnum
DROP TYPE "FeeFlowType";

