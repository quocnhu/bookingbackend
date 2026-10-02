-- AlterTable
ALTER TABLE "PaymentPeriod" ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedById" TEXT,
ADD COLUMN     "voidedByName" TEXT;
