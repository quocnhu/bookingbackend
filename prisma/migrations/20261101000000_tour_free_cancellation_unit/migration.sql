ALTER TABLE "Tour"
ADD COLUMN "freeCancellationValue" INTEGER,
ADD COLUMN "freeCancellationUnit" "DurationUnit";

UPDATE "Tour"
SET
  "freeCancellationUnit" = CASE
    WHEN "freeCancellationHours" IS NOT NULL AND "freeCancellationHours" % 24 = 0
      THEN 'DAY'::"DurationUnit"
    ELSE 'HOUR'::"DurationUnit"
  END,
  "freeCancellationValue" = CASE
    WHEN "freeCancellationHours" IS NOT NULL AND "freeCancellationHours" % 24 = 0
      THEN "freeCancellationHours" / 24
    ELSE "freeCancellationHours"
  END
WHERE "freeCancellationHours" IS NOT NULL;
