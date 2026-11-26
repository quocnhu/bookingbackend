-- Remove deprecated User.userType; role/profile relations are the source of truth.
ALTER TABLE "User" DROP COLUMN IF EXISTS "userType";
