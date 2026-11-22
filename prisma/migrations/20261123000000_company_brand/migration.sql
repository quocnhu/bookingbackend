ALTER TABLE "CompanyProfile" ADD COLUMN IF NOT EXISTS "shortName" TEXT;
ALTER TABLE "CompanyProfile" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
UPDATE "CompanyProfile" SET "shortName" = 'Hana Tourist' WHERE "shortName" IS NULL;
