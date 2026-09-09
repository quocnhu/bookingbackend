-- Add vehicle relation to RoutePrice
ALTER TABLE "RoutePrice" ADD COLUMN "vehicleId" TEXT;

-- Drop old unique constraint/index unique([tourId, providerId])
DROP INDEX IF EXISTS "RoutePrice_tourId_providerId_key";
ALTER TABLE "RoutePrice" DROP CONSTRAINT IF EXISTS "RoutePrice_tourId_providerId_key";

-- Foreign keys
ALTER TABLE "RoutePrice"
    ADD CONSTRAINT "RoutePrice_vehicleId_fkey"
    FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- New unique constraint unique([tourId, providerId, vehicleId])
CREATE UNIQUE INDEX "RoutePrice_tourId_providerId_vehicleId_key"
    ON "RoutePrice"("tourId", "providerId", "vehicleId");
