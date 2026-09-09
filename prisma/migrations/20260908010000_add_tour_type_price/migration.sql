-- Add per-type pricing to Tour (one declaration can carry both Private & Group prices)
CREATE TABLE "TourTypePrice" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tourId" TEXT NOT NULL,
    "type" "TourType" NOT NULL,
    "adultPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "childPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "infantPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourTypePrice_pkey" PRIMARY KEY ("id")
);

-- Backfill current prices for each existing tour's declared type
INSERT INTO "TourTypePrice" ("tourId","type","adultPrice","childPrice","infantPrice","currency","createdAt","updatedAt")
SELECT t."id", t."type", COALESCE(t."adultPrice",0), COALESCE(t."childPrice",0), COALESCE(t."infantPrice",0), t."currency", now(), now()
FROM "Tour" t;

ALTER TABLE "TourTypePrice" ADD CONSTRAINT "TourTypePrice_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "TourTypePrice_tourId_type_key" ON "TourTypePrice"("tourId", "type");
CREATE INDEX "TourTypePrice_tourId_idx" ON "TourTypePrice"("tourId");