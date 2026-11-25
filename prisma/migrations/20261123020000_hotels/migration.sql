ALTER TYPE "RoleType" ADD VALUE IF NOT EXISTS 'HOTEL';

CREATE TABLE "Hotel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "commissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Hotel_name_key" ON "Hotel"("name");

ALTER TABLE "User" ADD COLUMN "hotelId" TEXT;
CREATE UNIQUE INDEX "User_hotelId_key" ON "User"("hotelId");
ALTER TABLE "User" ADD CONSTRAINT "User_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Booking" ADD COLUMN "hotelId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "hotelCommissionPercent" DECIMAL(5,2);
CREATE INDEX "Booking_hotelId_idx" ON "Booking"("hotelId");
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Role" ("id", "name", "description", "isSystem", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'HOTEL', 'Hotel partner — own bookings and commission', false, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "name" = 'HOTEL');
