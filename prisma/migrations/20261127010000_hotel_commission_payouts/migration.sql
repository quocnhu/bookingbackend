DO $$ BEGIN
  CREATE TYPE "HotelCommissionPayoutStatus" AS ENUM ('PAID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE "HotelCommissionPayout" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'VND',
  "commissionPercent" DECIMAL(5,2) NOT NULL,
  "tourName" TEXT,
  "tourDate" TIMESTAMP(3),
  "note" TEXT,
  "status" "HotelCommissionPayoutStatus" NOT NULL DEFAULT 'PAID',
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidById" TEXT,
  "paidByName" TEXT,
  "paymentMethod" "PaymentMethod",
  "paymentReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HotelCommissionPayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HotelCommissionPayout_bookingId_key" ON "HotelCommissionPayout"("bookingId");
CREATE INDEX "HotelCommissionPayout_hotelId_paidAt_idx" ON "HotelCommissionPayout"("hotelId", "paidAt");
CREATE INDEX "HotelCommissionPayout_status_idx" ON "HotelCommissionPayout"("status");

ALTER TABLE "HotelCommissionPayout"
  ADD CONSTRAINT "HotelCommissionPayout_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HotelCommissionPayout"
  ADD CONSTRAINT "HotelCommissionPayout_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
