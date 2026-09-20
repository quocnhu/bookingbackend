-- Split the single tour discount into per-type (Private / Group) discounts.
-- Carry over any existing discount to both types, then drop the old column.
ALTER TABLE "Tour" ADD COLUMN "privateDiscountPercent" INTEGER DEFAULT 0;
ALTER TABLE "Tour" ADD COLUMN "groupDiscountPercent" INTEGER DEFAULT 0;
UPDATE "Tour" SET "privateDiscountPercent" = COALESCE("discountPercent", 0),
                  "groupDiscountPercent" = COALESCE("discountPercent", 0);
ALTER TABLE "Tour" DROP COLUMN "discountPercent";