-- Make phone and hotelName mandatory on Booking
UPDATE "Booking" SET "hotelName" = '' WHERE "hotelName" IS NULL;
UPDATE "Booking" SET "phone" = '' WHERE "phone" IS NULL;

ALTER TABLE "Booking" ALTER COLUMN "hotelName" SET NOT NULL;
ALTER TABLE "Booking" ALTER COLUMN "phone" SET NOT NULL;