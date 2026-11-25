CREATE TYPE "GuideHoldStatus" AS ENUM ('ACTIVE', 'RELEASED');

CREATE TABLE "GuideHold" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "status" "GuideHoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedById" TEXT,
    "releasedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuideHold_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GuideHold_guideId_startDate_endDate_idx" ON "GuideHold"("guideId", "startDate", "endDate");
CREATE INDEX "GuideHold_status_startDate_endDate_idx" ON "GuideHold"("status", "startDate", "endDate");

ALTER TABLE "GuideHold" ADD CONSTRAINT "GuideHold_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuideHold" ADD CONSTRAINT "GuideHold_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GuideHold" ADD CONSTRAINT "GuideHold_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
