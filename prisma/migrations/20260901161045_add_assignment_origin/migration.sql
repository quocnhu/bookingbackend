-- CreateEnum
CREATE TYPE "AssignmentOrigin" AS ENUM ('MANUAL', 'AUTO_ASSIGN');

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "origin" "AssignmentOrigin" NOT NULL DEFAULT 'MANUAL';
