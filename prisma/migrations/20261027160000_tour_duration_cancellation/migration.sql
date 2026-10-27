-- CreateEnum
CREATE TYPE "DurationUnit" AS ENUM ('HOUR', 'DAY');

-- AlterTable
ALTER TABLE "Tour" ADD COLUMN "durationValue" INTEGER,
ADD COLUMN "durationUnit" "DurationUnit",
ADD COLUMN "freeCancellationHours" INTEGER,
ADD COLUMN "cancellationPolicy" TEXT;

-- Backfill: existing day-based durations keep working, and every tour starts
-- with the standard 24-hour free-cancellation window.
UPDATE "Tour"
SET "durationValue" = "durationDays",
    "durationUnit" = 'DAY'
WHERE "durationDays" IS NOT NULL;

UPDATE "Tour"
SET "durationValue" = 5,
    "durationUnit" = 'HOUR'
WHERE "name" ILIKE '%5-Hour%';

UPDATE "Tour"
SET "freeCancellationHours" = 24;
