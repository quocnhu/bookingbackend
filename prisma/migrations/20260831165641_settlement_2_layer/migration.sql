/*
  Warnings:

  - You are about to drop the column `allowance` on the `Settlement` table. All the data in the column will be lost.
  - You are about to drop the column `baseAmount` on the `Settlement` table. All the data in the column will be lost.
  - You are about to drop the column `deduction` on the `Settlement` table. All the data in the column will be lost.
  - You are about to drop the column `finalAmount` on the `Settlement` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Settlement` table. All the data in the column will be lost.
  - You are about to drop the column `payeeType` on the `Settlement` table. All the data in the column will be lost.
  - You are about to drop the column `periodName` on the `Settlement` table. All the data in the column will be lost.
  - You are about to drop the column `providerId` on the `Settlement` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Settlement` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Settlement` table. All the data in the column will be lost.
  - You are about to drop the `ExpenseItem` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `amount` to the `Settlement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `Settlement` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FeeFlowType" AS ENUM ('COLLECT_MONEY', 'PAY_MONEY');

-- AlterEnum
ALTER TYPE "AssignmentStatus" ADD VALUE 'VERIFYING';

-- DropForeignKey
ALTER TABLE "ExpenseItem" DROP CONSTRAINT "ExpenseItem_settlementId_fkey";

-- DropForeignKey
ALTER TABLE "Settlement" DROP CONSTRAINT "Settlement_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "Settlement" DROP CONSTRAINT "Settlement_providerId_fkey";

-- DropForeignKey
ALTER TABLE "Settlement" DROP CONSTRAINT "Settlement_userId_fkey";

-- DropIndex
DROP INDEX "Settlement_assignmentId_key";

-- AlterTable
ALTER TABLE "Settlement" DROP COLUMN "allowance",
DROP COLUMN "baseAmount",
DROP COLUMN "deduction",
DROP COLUMN "finalAmount",
DROP COLUMN "notes",
DROP COLUMN "payeeType",
DROP COLUMN "periodName",
DROP COLUMN "providerId",
DROP COLUMN "status",
DROP COLUMN "userId",
ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "bookingId" TEXT,
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "customCategoryName" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "note" TEXT,
ALTER COLUMN "assignmentId" DROP NOT NULL;

-- DropTable
DROP TABLE "ExpenseItem";

-- DropEnum
DROP TYPE "PayeeType";

-- DropEnum
DROP TYPE "SettlementStatus";

-- CreateTable
CREATE TABLE "SettlementCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "flowType" "FeeFlowType" NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SettlementCategory_code_key" ON "SettlementCategory"("code");

-- CreateIndex
CREATE INDEX "Settlement_bookingId_idx" ON "Settlement"("bookingId");

-- CreateIndex
CREATE INDEX "Settlement_assignmentId_idx" ON "Settlement"("assignmentId");

-- CreateIndex
CREATE INDEX "Settlement_categoryId_idx" ON "Settlement"("categoryId");

-- CreateIndex
CREATE INDEX "Settlement_createdById_idx" ON "Settlement"("createdById");

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SettlementCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
