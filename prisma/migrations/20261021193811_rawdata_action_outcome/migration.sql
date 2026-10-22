/*
  Warnings:

  - You are about to drop the column `amendedBookingId` on the `RawData` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "RawData" DROP CONSTRAINT "RawData_amendedBookingId_fkey";

-- AlterTable
ALTER TABLE "RawData" DROP COLUMN "amendedBookingId",
ADD COLUMN     "action" TEXT,
ADD COLUMN     "linkedBookingId" TEXT,
ADD COLUMN     "outcome" TEXT;

-- AddForeignKey
ALTER TABLE "RawData" ADD CONSTRAINT "RawData_linkedBookingId_fkey" FOREIGN KEY ("linkedBookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
