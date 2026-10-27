-- AlterTable
ALTER TABLE "Tour" ADD COLUMN "departureTimes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "departureTime" TEXT;
