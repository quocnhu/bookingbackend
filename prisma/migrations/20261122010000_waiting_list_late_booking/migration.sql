-- Late bookings after the 23:00 dispatch seal + provider reminder tracking.
ALTER TYPE "AssignmentStatus" ADD VALUE IF NOT EXISTS 'WAITING_LIST';

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "lateBooking" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Assignment"
  ADD COLUMN IF NOT EXISTS "providerWarningAt" TIMESTAMP(3);
