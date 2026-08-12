-- AlterTable
ALTER TABLE "Tour" ADD COLUMN     "discountPercent" INTEGER DEFAULT 0,
ADD COLUMN     "promotionEndsAt" TIMESTAMP(3),
ADD COLUMN     "promotionStartsAt" TIMESTAMP(3);
