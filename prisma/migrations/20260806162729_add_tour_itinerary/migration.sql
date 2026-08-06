/*
  Warnings:

  - You are about to drop the column `itinerary` on the `Tour` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Tour" DROP COLUMN "itinerary";

-- CreateTable
CREATE TABLE "TourItinerary" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL DEFAULT 1,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "timeSlot" TEXT,
    "location" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourItinerary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TourItinerary_tourId_dayNumber_orderIndex_idx" ON "TourItinerary"("tourId", "dayNumber", "orderIndex");

-- AddForeignKey
ALTER TABLE "TourItinerary" ADD CONSTRAINT "TourItinerary_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
