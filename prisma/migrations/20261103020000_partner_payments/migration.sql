CREATE TYPE "PartnerPaymentStatus" AS ENUM ('LOCKED', 'PAID');

CREATE TABLE "PartnerPayment" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "moneyFlow" "PartnerMoneyFlow" NOT NULL,
    "tourName" TEXT,
    "tourDate" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "status" "PartnerPaymentStatus" NOT NULL DEFAULT 'LOCKED',
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedById" TEXT,
    "lockedByName" TEXT,
    "paidAt" TIMESTAMP(3),
    "paidById" TEXT,
    "paidByName" TEXT,
    "paymentMethod" "PaymentMethod",
    "paymentReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PartnerPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PartnerPayment_assignmentId_key" ON "PartnerPayment"("assignmentId");
CREATE INDEX "PartnerPayment_partnerId_paidAt_idx" ON "PartnerPayment"("partnerId", "paidAt");
CREATE INDEX "PartnerPayment_status_idx" ON "PartnerPayment"("status");

ALTER TABLE "PartnerPayment" ADD CONSTRAINT "PartnerPayment_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerPayment" ADD CONSTRAINT "PartnerPayment_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "PartnerAgency"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

-- Backfill already locked partner trips so existing closed partner money appears
-- in Payment history immediately after this migration.
INSERT INTO "PartnerPayment" (
  "id", "assignmentId", "partnerId", "amount", "currency", "moneyFlow",
  "tourName", "tourDate", "note", "status", "lockedAt", "lockedById",
  "lockedByName", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  a."id",
  a."partnerId",
  a."partnerAmount",
  COALESCE(a."partnerCurrency", 'VND'),
  COALESCE(a."partnerMoneyFlow", 'PARTNER_COLLECTS_AND_REMITS'),
  a."tourName",
  a."startDate",
  tr."notes",
  'LOCKED'::"PartnerPaymentStatus",
  COALESCE(tr."moneyVerifiedAt", NOW()),
  tr."moneyVerifiedById",
  tr."moneyVerifiedByName",
  COALESCE(tr."moneyVerifiedAt", NOW()),
  NOW()
FROM "Assignment" a
JOIN "TourReport" tr ON tr."assignmentId" = a."id"
WHERE a."executionMode" = 'OUTSOURCED_PARTNER'
  AND a."partnerId" IS NOT NULL
  AND a."partnerAmount" IS NOT NULL
  AND a."partnerAmount" > 0
  AND tr."moneyVerifiedAt" IS NOT NULL
ON CONFLICT ("assignmentId") DO NOTHING;
