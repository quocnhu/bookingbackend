-- Rename RoleType.CUSTOMER to TOURIST. Keep PayerType.CUSTOMER unchanged.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'RoleType' AND e.enumlabel = 'CUSTOMER'
  ) THEN
    ALTER TYPE "RoleType" RENAME VALUE 'CUSTOMER' TO 'TOURIST';
  END IF;
END $$;

UPDATE "Role"
SET "name" = 'TOURIST',
    "description" = 'Tourist — dashboard, own bookings, and own payment records'
WHERE "name" = 'CUSTOMER';

INSERT INTO "Role" ("id", "name", "description", "isSystem", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'TOURIST', 'Tourist — dashboard, own bookings, and own payment records', false, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "name" = 'TOURIST');

INSERT INTO "Role" ("id", "name", "description", "isSystem", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'HOTEL', 'Hotel partner — own bookings and commission', false, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "name" = 'HOTEL');

UPDATE "Role"
SET "description" = 'Hotel partner — own bookings and commission',
    "updatedAt" = now()
WHERE "name" = 'HOTEL';

DELETE FROM "RolePermission"
WHERE "roleId" IN (SELECT "id" FROM "Role" WHERE "name" IN ('TOURIST', 'HOTEL'));

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."code" IN ('dashboard.read', 'booking.read')
WHERE r."name" IN ('TOURIST', 'HOTEL')
ON CONFLICT DO NOTHING;
