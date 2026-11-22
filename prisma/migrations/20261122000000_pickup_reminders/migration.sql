CREATE TYPE "PickupReminderMode" AS ENUM ('AUTO', 'MANUAL');

ALTER TABLE "Assignment"
  ADD COLUMN "pickupReminderMode" "PickupReminderMode" NOT NULL DEFAULT 'AUTO',
  ADD COLUMN "pickupReminderLastSentAt" TIMESTAMP(3);

ALTER TABLE "Booking" ADD COLUMN "pickupReminderSentAt" TIMESTAMP(3);
