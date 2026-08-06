-- CreateTable
CREATE TABLE "AuthActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "authProvider" "AuthProvider",
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthActivity_userId_idx" ON "AuthActivity"("userId");

-- CreateIndex
CREATE INDEX "AuthActivity_eventType_idx" ON "AuthActivity"("eventType");

-- CreateIndex
CREATE INDEX "AuthActivity_createdAt_idx" ON "AuthActivity"("createdAt");

-- AddForeignKey
ALTER TABLE "AuthActivity" ADD CONSTRAINT "AuthActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
