-- Track which staff member approved/rejected each leave request.
ALTER TABLE "UserLeave" ADD COLUMN "reviewedById" TEXT;
ALTER TABLE "UserLeave" ADD COLUMN "reviewedAt" TIMESTAMP(3);

ALTER TABLE "UserLeave"
  ADD CONSTRAINT "UserLeave_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "UserLeave_reviewedById_idx" ON "UserLeave"("reviewedById");