CREATE TABLE "TourCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TourCategory_name_key" ON "TourCategory"("name");
CREATE UNIQUE INDEX "TourCategory_slug_key" ON "TourCategory"("slug");
CREATE INDEX "TourCategory_isActive_sortOrder_idx" ON "TourCategory"("isActive", "sortOrder");

CREATE TABLE "TourCategoryLink" (
    "tourId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TourCategoryLink_pkey" PRIMARY KEY ("tourId", "categoryId")
);

CREATE INDEX "TourCategoryLink_categoryId_idx" ON "TourCategoryLink"("categoryId");

ALTER TABLE "TourCategoryLink" ADD CONSTRAINT "TourCategoryLink_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TourCategoryLink" ADD CONSTRAINT "TourCategoryLink_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TourCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
