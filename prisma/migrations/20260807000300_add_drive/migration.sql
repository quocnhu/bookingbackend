CREATE TABLE "DriveFolder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'folder',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriveFolder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DriveFile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriveFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DriveFolder_userId_parentId_idx" ON "DriveFolder"("userId", "parentId");
CREATE INDEX "DriveFile_userId_folderId_idx" ON "DriveFile"("userId", "folderId");
CREATE UNIQUE INDEX "DriveFile_storageKey_key" ON "DriveFile"("storageKey");

ALTER TABLE "DriveFolder" ADD CONSTRAINT "DriveFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriveFolder" ADD CONSTRAINT "DriveFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DriveFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriveFile" ADD CONSTRAINT "DriveFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriveFile" ADD CONSTRAINT "DriveFile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "DriveFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
