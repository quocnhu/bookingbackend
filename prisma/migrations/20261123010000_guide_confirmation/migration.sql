ALTER TABLE "Assignment"
  ADD COLUMN "guideConfirmationRequestedAt" TIMESTAMP(3),
  ADD COLUMN "guideConfirmationEmailSentAt" TIMESTAMP(3),
  ADD COLUMN "guideConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "guideDeclinedAt" TIMESTAMP(3),
  ADD COLUMN "guideDeclineReason" TEXT;
