-- AlterTable
ALTER TABLE "Tour" ADD COLUMN     "highlights" TEXT,
ADD COLUMN     "insurancePolicy" TEXT,
ADD COLUMN     "mapQuery" TEXT,
ALTER COLUMN "currency" SET DEFAULT 'USD';

-- AlterTable
ALTER TABLE "TourItinerary" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "mapQuery" TEXT;

-- CreateTable
CREATE TABLE "TourGallery" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sortIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TourGallery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TourGallery_storageKey_key" ON "TourGallery"("storageKey");

-- CreateIndex
CREATE INDEX "TourGallery_tourId_sortIndex_idx" ON "TourGallery"("tourId", "sortIndex");

-- AddForeignKey
ALTER TABLE "TourGallery" ADD CONSTRAINT "TourGallery_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
