-- Alter default currency USD -> VND
ALTER TABLE "Tour" ALTER COLUMN "currency" SET DEFAULT 'VND';
ALTER TABLE "TourTypePrice" ALTER COLUMN "currency" SET DEFAULT 'VND';
