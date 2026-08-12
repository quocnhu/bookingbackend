-- AlterTable
ALTER TABLE "RawData" ADD COLUMN     "email" TEXT,
ADD COLUMN     "payloadHash" TEXT;

-- CreateIndex
CREATE INDEX "RawData_payloadHash_idx" ON "RawData"("payloadHash");
