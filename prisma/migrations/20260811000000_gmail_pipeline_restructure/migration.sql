-- AlterEnum
ALTER TYPE "BookingProvider" ADD VALUE 'AIRBNB';
ALTER TYPE "BookingProvider" ADD VALUE 'BOOKING_COM';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "source" TEXT,
ADD COLUMN     "confirmationCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_source_confirmationCode_key" ON "Booking"("source", "confirmationCode");

-- AlterTable
ALTER TABLE "RawData" ADD COLUMN     "templateTag" TEXT;
