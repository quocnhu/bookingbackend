-- Giữ lại toàn bộ drive (kể cả avatar folder) khi user bị xoá:
-- chuyển FK DriveFolder/DriveFile -> User từ ON DELETE CASCADE sang SET NULL.
ALTER TABLE "DriveFolder" DROP CONSTRAINT "DriveFolder_userId_fkey";
ALTER TABLE "DriveFolder" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "DriveFolder"
  ADD CONSTRAINT "DriveFolder_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DriveFile" DROP CONSTRAINT "DriveFile_userId_fkey";
ALTER TABLE "DriveFile" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "DriveFile"
  ADD CONSTRAINT "DriveFile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
