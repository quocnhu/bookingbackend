-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('ADMIN', 'OFFICE', 'TOUR_GUIDE', 'DRIVER', 'TRANSPORT_PROVIDER', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "TourType" AS ENUM ('PRIVATE_TOUR', 'GROUP_TOUR');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'ASSIGNED', 'CANCELED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'DISPATCHED', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "GuideType" AS ENUM ('OFFICIAL', 'FREELANCE');

-- CreateEnum
CREATE TYPE "PayeeType" AS ENUM ('V_PROVIDER', 'FREELANCE_GUIDE', 'OFFICIAL_GUIDE');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID');

-- CreateEnum
CREATE TYPE "BookingProvider" AS ENUM ('TRIPADVISOR', 'WEBSITE', 'MANUAL');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("userId","permissionId")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "authProvider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
    "role" "RoleType" NOT NULL DEFAULT 'OFFICE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "userType" TEXT,
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLeave" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLeave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "loggedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loggedOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,

    CONSTRAINT "DriverProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "GuideType" NOT NULL DEFAULT 'FREELANCE',
    "languages" TEXT[],
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,

    CONSTRAINT "GuideProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tour" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TourType" NOT NULL,
    "itinerary" TEXT,
    "adultPrice" DECIMAL(65,30) DEFAULT 0,
    "childPrice" DECIMAL(65,30) DEFAULT 0,
    "infantPrice" DECIMAL(65,30) DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'VND',

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportationProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TransportationProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "capacity" INTEGER DEFAULT 29,
    "providerId" TEXT NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutePrice" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "RoutePrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "bookingRef" TEXT NOT NULL,
    "channel" "BookingProvider" NOT NULL DEFAULT 'MANUAL',
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "tourId" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "startingDate" TIMESTAMP(3),
    "customerName" TEXT,
    "hotelName" TEXT,
    "phone" TEXT,
    "mail" TEXT,
    "totalPax" INTEGER NOT NULL DEFAULT 0,
    "paxDetail" TEXT,
    "tourType" "TourType",
    "tourName" TEXT,
    "payment" "PaymentStatus" DEFAULT 'PENDING',
    "isNoShow" BOOLEAN NOT NULL DEFAULT false,
    "noShowReason" TEXT,
    "rawDataId" TEXT,
    "assignmentId" TEXT,
    "paxSequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "vehicleId" TEXT,
    "providerId" TEXT,
    "driverId" TEXT,
    "guideId" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "sequenceIndex" INTEGER NOT NULL DEFAULT 0,
    "priceOverride" DECIMAL(65,30),
    "tripNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "payeeType" "PayeeType" NOT NULL,
    "providerId" TEXT,
    "userId" TEXT,
    "baseAmount" DECIMAL(65,30) NOT NULL,
    "allowance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "deduction" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "finalAmount" DECIMAL(65,30) NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "periodName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseItem" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "receiptUrl" TEXT,

    CONSTRAINT "ExpenseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GmailAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "lastHistoryId" TEXT NOT NULL,
    "watchExpiration" TIMESTAMP(3) NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawData" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coordinate" (
    "id" TEXT NOT NULL,
    "hotelName" TEXT NOT NULL,
    "starRating" TEXT,
    "address" TEXT NOT NULL,
    "coordinate" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coordinate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeData" JSONB,
    "afterData" JSONB,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserLeave_userId_startDate_endDate_idx" ON "UserLeave"("userId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_token_key" ON "UserSession"("token");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_loggedInAt_idx" ON "UserSession"("loggedInAt");

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GuideProfile_userId_key" ON "GuideProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Tour_name_key" ON "Tour"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RoutePrice_tourId_providerId_key" ON "RoutePrice"("tourId", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingRef_key" ON "Booking"("bookingRef");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_rawDataId_key" ON "Booking"("rawDataId");

-- CreateIndex
CREATE INDEX "Booking_assignmentId_paxSequence_idx" ON "Booking"("assignmentId", "paxSequence");

-- CreateIndex
CREATE INDEX "Assignment_status_sequenceIndex_idx" ON "Assignment"("status", "sequenceIndex");

-- CreateIndex
CREATE INDEX "Assignment_startDate_endDate_idx" ON "Assignment"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_assignmentId_key" ON "Settlement"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "GmailAccount_email_key" ON "GmailAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RawData_sourceId_key" ON "RawData"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Coordinate_address_key" ON "Coordinate"("address");

-- CreateIndex
CREATE INDEX "Coordinate_latitude_longitude_idx" ON "Coordinate"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "TransportationProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLeave" ADD CONSTRAINT "UserLeave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideProfile" ADD CONSTRAINT "GuideProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "TransportationProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutePrice" ADD CONSTRAINT "RoutePrice_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutePrice" ADD CONSTRAINT "RoutePrice_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "TransportationProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_rawDataId_fkey" FOREIGN KEY ("rawDataId") REFERENCES "RawData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "TransportationProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "TransportationProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseItem" ADD CONSTRAINT "ExpenseItem_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
