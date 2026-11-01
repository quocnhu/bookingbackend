-- CreateEnum
CREATE TYPE "PaymentRecordStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PAYPAL', 'CASH', 'BANK_TRANSFER', 'OTA');

-- CreateEnum
CREATE TYPE "PayerType" AS ENUM ('CUSTOMER', 'OTA', 'GUIDE', 'STAFF');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'VND',
ADD COLUMN     "customerUserId" TEXT,
ADD COLUMN     "payLater" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentCollectedAt" TIMESTAMP(3),
ADD COLUMN     "paymentCollectedById" TEXT,
ADD COLUMN     "paymentCollectedByName" TEXT,
ADD COLUMN     "paymentConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "paymentConfirmedById" TEXT,
ADD COLUMN     "paymentConfirmedByName" TEXT,
ADD COLUMN     "paymentDueAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "paymentNote" TEXT,
ADD COLUMN     "totalAmount" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "PaymentPeriod" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paidById" TEXT,
ADD COLUMN     "paidByName" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "paymentReference" TEXT;

-- CreateTable
CREATE TABLE "BookingPayment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "method" "PaymentMethod" NOT NULL,
    "payerType" "PayerType" NOT NULL DEFAULT 'CUSTOMER',
    "status" "PaymentRecordStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "providerOrderId" TEXT,
    "providerCaptureId" TEXT,
    "providerAmount" DECIMAL(12,2),
    "providerCurrency" TEXT,
    "exchangeRate" DECIMAL(14,4),
    "grossAmount" DECIMAL(12,2),
    "commissionAmount" DECIMAL(12,2),
    "paidAt" TIMESTAMP(3),
    "createdById" TEXT,
    "confirmedById" TEXT,
    "confirmedByName" TEXT,
    "note" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingPayment_providerOrderId_key" ON "BookingPayment"("providerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPayment_providerCaptureId_key" ON "BookingPayment"("providerCaptureId");

-- CreateIndex
CREATE INDEX "BookingPayment_bookingId_status_idx" ON "BookingPayment"("bookingId", "status");

-- CreateIndex
CREATE INDEX "BookingPayment_provider_status_idx" ON "BookingPayment"("provider", "status");

-- CreateIndex
CREATE INDEX "Booking_customerUserId_idx" ON "Booking"("customerUserId");

-- CreateIndex
CREATE INDEX "Booking_payment_payLater_idx" ON "Booking"("payment", "payLater");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPayment" ADD CONSTRAINT "BookingPayment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPayment" ADD CONSTRAINT "BookingPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

