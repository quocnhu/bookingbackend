CREATE TABLE "TourPrivatePaxPrice" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "pax" INTEGER NOT NULL,
    "pricePerPerson" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TourPrivatePaxPrice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TourPrivatePaxPrice_tourId_pax_key" ON "TourPrivatePaxPrice"("tourId", "pax");
CREATE INDEX "TourPrivatePaxPrice_tourId_idx" ON "TourPrivatePaxPrice"("tourId");

ALTER TABLE "TourPrivatePaxPrice" ADD CONSTRAINT "TourPrivatePaxPrice_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "TourPrivatePaxPrice" ("id", "tourId", "pax", "pricePerPerson", "currency", "updatedAt")
SELECT gen_random_uuid()::text, "tourId", 1, "adultPrice", "currency", CURRENT_TIMESTAMP
FROM "TourTypePrice"
WHERE "type" = 'PRIVATE_TOUR' AND "adultPrice" > 0
ON CONFLICT ("tourId", "pax") DO NOTHING;
