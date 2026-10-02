-- CreateEnum
CREATE TYPE "DriverType" AS ENUM ('COMPANY', 'FREELANCE');

-- CreateEnum
CREATE TYPE "PayeeType" AS ENUM ('TRANSPORT_PROVIDER', 'COMPANY_GUIDE', 'COMPANY_DRIVER', 'FREELANCE');

-- AlterTable
ALTER TABLE "DriverProfile" ADD COLUMN     "type" "DriverType" NOT NULL DEFAULT 'COMPANY';

-- AlterTable
ALTER TABLE "PaymentPeriod" ADD COLUMN     "payeeName" TEXT,
ADD COLUMN     "payeeType" "PayeeType" NOT NULL DEFAULT 'COMPANY_GUIDE';
