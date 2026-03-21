-- CreateEnum
CREATE TYPE "ImportEntityType" AS ENUM ('FILAMENT', 'CONSUMABLE', 'TOOL_PART', 'WISHLIST');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('STAGED', 'APPLIED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('NEW', 'MATCHED', 'CONFLICT', 'SKIPPED', 'APPLIED', 'ERROR');

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "entityType" "ImportEntityType" NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'STAGED',
    "sourceName" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "notes" TEXT,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "newRows" INTEGER NOT NULL DEFAULT 0,
    "matchedRows" INTEGER NOT NULL DEFAULT 0,
    "conflictRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "entityType" "ImportEntityType" NOT NULL,
    "status" "ImportRowStatus" NOT NULL DEFAULT 'NEW',
    "fingerprint" TEXT NOT NULL,
    "suggestedMatchId" TEXT,
    "suggestedMatchSlug" TEXT,
    "data" JSONB NOT NULL,
    "validationErrors" TEXT[],
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportJob_workspaceId_createdAt_idx" ON "ImportJob"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportRow_importJobId_rowIndex_key" ON "ImportRow"("importJobId", "rowIndex");

-- CreateIndex
CREATE INDEX "ImportRow_workspaceId_status_idx" ON "ImportRow"("workspaceId", "status");

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
