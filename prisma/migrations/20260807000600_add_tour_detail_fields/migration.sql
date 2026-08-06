-- Thêm các trường chi tiết cho trang tour (layout kiểu "Chương trình Tour")
-- và bảng TourDeparture (Lịch khởi hành & Bảng giá).
ALTER TABLE "Tour" ADD COLUMN "departureLocation" TEXT;
ALTER TABLE "Tour" ADD COLUMN "transportation" TEXT;
ALTER TABLE "Tour" ADD COLUMN "overview" TEXT;
ALTER TABLE "Tour" ADD COLUMN "includedServices" TEXT;
ALTER TABLE "Tour" ADD COLUMN "excludedServices" TEXT;
ALTER TABLE "Tour" ADD COLUMN "childrenPolicy" TEXT;
ALTER TABLE "Tour" ADD COLUMN "regulations" TEXT;

CREATE TABLE "TourDeparture" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "adultPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "childPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "infantPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TourDeparture_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TourDeparture_tourId_departureDate_idx" ON "TourDeparture"("tourId", "departureDate");

ALTER TABLE "TourDeparture"
    ADD CONSTRAINT "TourDeparture_tourId_fkey"
    FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
