-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "PrinterStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'OFFLINE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MaterialSystemType" AS ENUM ('AMS_LITE', 'AMS_2_PRO', 'AMS_HT', 'DRYER');

-- CreateEnum
CREATE TYPE "MaterialSystemStatus" AS ENUM ('ACTIVE', 'STANDBY', 'MAINTENANCE', 'OFFLINE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BuildPlateStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'WORN', 'RETIRED');

-- CreateEnum
CREATE TYPE "HotendStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'LOW_STOCK', 'RETIRED');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('HEALTHY', 'LOW', 'OUT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SafetyStatus" AS ENUM ('ACTIVE', 'NEEDS_ATTENTION', 'PLANNED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SmartPlugStatus" AS ENUM ('ONLINE', 'OFFLINE', 'DISABLED');

-- CreateEnum
CREATE TYPE "WishlistPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "WishlistStatus" AS ENUM ('PLANNED', 'RESEARCHING', 'READY_TO_BUY', 'PURCHASED');

-- CreateEnum
CREATE TYPE "MaintenanceActionType" AS ENUM ('NOZZLE_SWAP', 'LUBRICATION', 'BED_CLEANING', 'WIPER_REPLACEMENT', 'PTFE_REPLACEMENT', 'DESICCANT_REFRESH', 'EXHAUST_UPDATE', 'INSPECTION', 'FIRMWARE_REVIEW', 'OTHER');

-- CreateEnum
CREATE TYPE "FilamentHygroscopicLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "activeWorkspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("sessionToken")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "Printer" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "PrinterStatus" NOT NULL DEFAULT 'ACTIVE',
    "buildVolumeX" INTEGER NOT NULL,
    "buildVolumeY" INTEGER NOT NULL,
    "buildVolumeZ" INTEGER NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "imageUrl" TEXT,
    "smartPlugId" TEXT,
    "installedHotendId" TEXT,
    "installedPlateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialSystem" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "MaterialSystemType" NOT NULL,
    "supportedMaterialsNotes" TEXT,
    "status" "MaterialSystemStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "imageUrl" TEXT,
    "assignedPrinterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildPlate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sizeLabel" TEXT NOT NULL,
    "sizeMm" INTEGER NOT NULL,
    "surfaceType" TEXT NOT NULL,
    "status" "BuildPlateStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildPlate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hotend" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nozzleSize" DECIMAL(4,2) NOT NULL,
    "materialType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "inUseCount" INTEGER NOT NULL DEFAULT 0,
    "spareCount" INTEGER NOT NULL DEFAULT 0,
    "status" "HotendStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hotend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilamentSpool" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "productLine" TEXT,
    "materialType" TEXT NOT NULL,
    "subtype" TEXT,
    "finish" TEXT,
    "color" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "estimatedRemainingGrams" INTEGER,
    "spoolWeightGrams" INTEGER DEFAULT 1000,
    "compatibilityTags" TEXT[],
    "dryingRequired" BOOLEAN,
    "abrasive" BOOLEAN DEFAULT false,
    "hygroscopicLevel" "FilamentHygroscopicLevel",
    "storageLocation" TEXT,
    "purchaseSource" TEXT,
    "status" "StockStatus" NOT NULL DEFAULT 'HEALTHY',
    "opened" BOOLEAN NOT NULL DEFAULT false,
    "nearlyEmpty" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilamentSpool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilamentRecommendation" (
    "id" TEXT NOT NULL,
    "filamentId" TEXT NOT NULL,
    "recommendedNozzle" TEXT,
    "dryerSuggested" BOOLEAN NOT NULL DEFAULT false,
    "hardenedNozzleNeeded" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "FilamentRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumableItem" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "reorderThreshold" DECIMAL(10,2) NOT NULL,
    "status" "StockStatus" NOT NULL DEFAULT 'HEALTHY',
    "storageLocation" TEXT,
    "notes" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsumableItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyEquipment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "SafetyStatus" NOT NULL DEFAULT 'ACTIVE',
    "replacementSchedule" TEXT,
    "notes" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartPlug" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "SmartPlugStatus" NOT NULL DEFAULT 'ONLINE',
    "assignedDeviceLabel" TEXT,
    "powerMonitoringCapable" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmartPlug_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolPart" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "storageLocation" TEXT,
    "notes" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "WishlistPriority" NOT NULL,
    "estimatedCost" DECIMAL(10,2),
    "vendor" TEXT,
    "purchaseUrl" TEXT,
    "notes" TEXT,
    "status" "WishlistStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "actionType" "MaintenanceActionType" NOT NULL,
    "actionPerformed" TEXT NOT NULL,
    "notes" TEXT,
    "printerId" TEXT,
    "materialSystemId" TEXT,
    "buildPlateId" TEXT,
    "hotendId" TEXT,
    "safetyEquipmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceConsumableUsage" (
    "id" TEXT NOT NULL,
    "maintenanceLogId" TEXT NOT NULL,
    "consumableItemId" TEXT NOT NULL,
    "quantityUsed" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "MaintenanceConsumableUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrinterBuildPlate" (
    "id" TEXT NOT NULL,
    "printerId" TEXT NOT NULL,
    "buildPlateId" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "PrinterBuildPlate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrinterHotend" (
    "id" TEXT NOT NULL,
    "printerId" TEXT NOT NULL,
    "hotendId" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "PrinterHotend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrinterMaterialSystem" (
    "id" TEXT NOT NULL,
    "printerId" TEXT NOT NULL,
    "materialSystemId" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "PrinterMaterialSystem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Printer_smartPlugId_key" ON "Printer"("smartPlugId");

-- CreateIndex
CREATE UNIQUE INDEX "Printer_installedHotendId_key" ON "Printer"("installedHotendId");

-- CreateIndex
CREATE UNIQUE INDEX "Printer_installedPlateId_key" ON "Printer"("installedPlateId");

-- CreateIndex
CREATE UNIQUE INDEX "Printer_workspaceId_slug_key" ON "Printer"("workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialSystem_workspaceId_slug_key" ON "MaterialSystem"("workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "BuildPlate_workspaceId_slug_key" ON "BuildPlate"("workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Hotend_workspaceId_slug_key" ON "Hotend"("workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "FilamentRecommendation_filamentId_key" ON "FilamentRecommendation"("filamentId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsumableItem_workspaceId_slug_key" ON "ConsumableItem"("workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyEquipment_workspaceId_slug_key" ON "SafetyEquipment"("workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "SmartPlug_workspaceId_slug_key" ON "SmartPlug"("workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ToolPart_workspaceId_slug_key" ON "ToolPart"("workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_workspaceId_slug_key" ON "WishlistItem"("workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "PrinterBuildPlate_printerId_buildPlateId_key" ON "PrinterBuildPlate"("printerId", "buildPlateId");

-- CreateIndex
CREATE UNIQUE INDEX "PrinterHotend_printerId_hotendId_key" ON "PrinterHotend"("printerId", "hotendId");

-- CreateIndex
CREATE UNIQUE INDEX "PrinterMaterialSystem_printerId_materialSystemId_key" ON "PrinterMaterialSystem"("printerId", "materialSystemId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeWorkspaceId_fkey" FOREIGN KEY ("activeWorkspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Printer" ADD CONSTRAINT "Printer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Printer" ADD CONSTRAINT "Printer_smartPlugId_fkey" FOREIGN KEY ("smartPlugId") REFERENCES "SmartPlug"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Printer" ADD CONSTRAINT "Printer_installedHotendId_fkey" FOREIGN KEY ("installedHotendId") REFERENCES "Hotend"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Printer" ADD CONSTRAINT "Printer_installedPlateId_fkey" FOREIGN KEY ("installedPlateId") REFERENCES "BuildPlate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialSystem" ADD CONSTRAINT "MaterialSystem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialSystem" ADD CONSTRAINT "MaterialSystem_assignedPrinterId_fkey" FOREIGN KEY ("assignedPrinterId") REFERENCES "Printer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildPlate" ADD CONSTRAINT "BuildPlate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hotend" ADD CONSTRAINT "Hotend_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilamentSpool" ADD CONSTRAINT "FilamentSpool_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilamentRecommendation" ADD CONSTRAINT "FilamentRecommendation_filamentId_fkey" FOREIGN KEY ("filamentId") REFERENCES "FilamentSpool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumableItem" ADD CONSTRAINT "ConsumableItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyEquipment" ADD CONSTRAINT "SafetyEquipment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartPlug" ADD CONSTRAINT "SmartPlug_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolPart" ADD CONSTRAINT "ToolPart_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_materialSystemId_fkey" FOREIGN KEY ("materialSystemId") REFERENCES "MaterialSystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_buildPlateId_fkey" FOREIGN KEY ("buildPlateId") REFERENCES "BuildPlate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_hotendId_fkey" FOREIGN KEY ("hotendId") REFERENCES "Hotend"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_safetyEquipmentId_fkey" FOREIGN KEY ("safetyEquipmentId") REFERENCES "SafetyEquipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceConsumableUsage" ADD CONSTRAINT "MaintenanceConsumableUsage_maintenanceLogId_fkey" FOREIGN KEY ("maintenanceLogId") REFERENCES "MaintenanceLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceConsumableUsage" ADD CONSTRAINT "MaintenanceConsumableUsage_consumableItemId_fkey" FOREIGN KEY ("consumableItemId") REFERENCES "ConsumableItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrinterBuildPlate" ADD CONSTRAINT "PrinterBuildPlate_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrinterBuildPlate" ADD CONSTRAINT "PrinterBuildPlate_buildPlateId_fkey" FOREIGN KEY ("buildPlateId") REFERENCES "BuildPlate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrinterHotend" ADD CONSTRAINT "PrinterHotend_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrinterHotend" ADD CONSTRAINT "PrinterHotend_hotendId_fkey" FOREIGN KEY ("hotendId") REFERENCES "Hotend"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrinterMaterialSystem" ADD CONSTRAINT "PrinterMaterialSystem_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrinterMaterialSystem" ADD CONSTRAINT "PrinterMaterialSystem_materialSystemId_fkey" FOREIGN KEY ("materialSystemId") REFERENCES "MaterialSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

