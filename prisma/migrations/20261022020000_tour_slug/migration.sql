-- AlterTable
ALTER TABLE "Tour" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Tour_slug_key" ON "Tour"("slug");
