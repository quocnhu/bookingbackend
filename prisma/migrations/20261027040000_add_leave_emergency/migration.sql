-- Emergency leave flag. Emergency requests are highlighted in the UI and
-- allow last-minute submission before the 04:00 automatic dispatch cutoff.
ALTER TABLE "UserLeave" ADD COLUMN "isEmergency" BOOLEAN NOT NULL DEFAULT false;
