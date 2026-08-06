-- CreateSequence
CREATE SEQUENCE "tour_code_seq" START WITH 1 INCREMENT BY 1;

-- AlterTable
ALTER TABLE "Tour" ADD COLUMN "code" TEXT;

-- Backfill existing rows (if any) so the column can be NOT NULL
UPDATE "Tour" SET "code" = 'TOUR-' || LPAD(nextval('tour_code_seq')::TEXT, 4, '0') WHERE "code" IS NULL;

-- AlterTable
ALTER TABLE "Tour" ALTER COLUMN "code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Tour_code_key" ON "Tour"("code");
