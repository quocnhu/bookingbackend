-- AlterTable
ALTER TABLE "RawData" ADD COLUMN     "amendedBookingId" TEXT;

-- AddForeignKey
ALTER TABLE "RawData" ADD CONSTRAINT "RawData_amendedBookingId_fkey" FOREIGN KEY ("amendedBookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
