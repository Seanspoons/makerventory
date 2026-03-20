"use server";

import {
  FilamentHygroscopicLevel,
  MaterialSystemType,
  MaintenanceActionType,
  StockStatus,
  WishlistPriority,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { setFlashMessage } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

function requiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing ${key}`);
  }
  return value.trim();
}

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const raw = formData.get(key);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function revalidateInventory() {
  [
    "/",
    "/printers",
    "/material-systems",
    "/build-plates",
    "/hotends",
    "/filament",
    "/consumables",
    "/safety",
    "/smart-plugs",
    "/tools-parts",
    "/wishlist",
    "/maintenance",
  ].forEach((path) => revalidatePath(path));
}

function booleanValue(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

export async function createInventoryItem(formData: FormData) {
  const kind = requiredString(formData, "kind");

  switch (kind) {
    case "printer": {
      const name = requiredString(formData, "name");
      await prisma.printer.create({
        data: {
          name,
          slug: `${slugify(name)}-${Date.now()}`,
          brand: requiredString(formData, "brand"),
          model: requiredString(formData, "model"),
          buildVolumeX: numberValue(formData, "buildVolumeX", 180),
          buildVolumeY: numberValue(formData, "buildVolumeY", 180),
          buildVolumeZ: numberValue(formData, "buildVolumeZ", 180),
          location: optionalString(formData, "location"),
          notes: optionalString(formData, "notes"),
        },
      });
      break;
    }
    case "material-system": {
      const name = requiredString(formData, "name");
      await prisma.materialSystem.create({
        data: {
          name,
          slug: `${slugify(name)}-${Date.now()}`,
          type: requiredString(formData, "type") as MaterialSystemType,
          supportedMaterialsNotes: optionalString(formData, "supportedMaterialsNotes"),
          notes: optionalString(formData, "notes"),
        },
      });
      break;
    }
    case "build-plate": {
      const name = requiredString(formData, "name");
      await prisma.buildPlate.create({
        data: {
          name,
          slug: `${slugify(name)}-${Date.now()}`,
          sizeLabel: requiredString(formData, "sizeLabel"),
          sizeMm: numberValue(formData, "sizeMm", 256),
          surfaceType: requiredString(formData, "surfaceType"),
          notes: optionalString(formData, "notes"),
        },
      });
      break;
    }
    case "hotend": {
      const name = requiredString(formData, "name");
      const quantity = numberValue(formData, "quantity", 1);
      await prisma.hotend.create({
        data: {
          name,
          slug: `${slugify(name)}-${Date.now()}`,
          nozzleSize: numberValue(formData, "nozzleSize", 0.4),
          materialType: requiredString(formData, "materialType"),
          quantity,
          spareCount: Math.max(0, quantity),
          notes: optionalString(formData, "notes"),
        },
      });
      break;
    }
    case "filament": {
      const brand = requiredString(formData, "brand");
      const materialType = requiredString(formData, "materialType");
      const color = requiredString(formData, "color");
      const abrasive = formData.get("abrasive") === "on";
      const dryingRequired = formData.get("dryingRequired") === "on";
      await prisma.filamentSpool.create({
        data: {
          brand,
          materialType,
          color,
          quantity: numberValue(formData, "quantity", 1),
          estimatedRemainingGrams: numberValue(formData, "estimatedRemainingGrams", 1000),
          storageLocation: optionalString(formData, "storageLocation"),
          abrasive,
          dryingRequired,
          hygroscopicLevel:
            (optionalString(formData, "hygroscopicLevel") as
              | "LOW"
              | "MEDIUM"
              | "HIGH"
              | null) ?? undefined,
          compatibilityTags: abrasive
            ? ["Abrasive", "Hardened Nozzle"]
            : dryingRequired
              ? ["Dryer Recommended"]
              : ["General Purpose"],
          notes: optionalString(formData, "notes"),
          status:
            numberValue(formData, "estimatedRemainingGrams", 1000) <= 250
              ? StockStatus.LOW
              : StockStatus.HEALTHY,
          filamentRecommendation: {
            create: {
              recommendedNozzle: abrasive ? "Hardened Steel 0.4mm+" : "Standard 0.4mm",
              dryerSuggested: dryingRequired,
              hardenedNozzleNeeded: abrasive,
              notes: optionalString(formData, "recommendationNotes"),
            },
          },
        },
      });
      break;
    }
    case "consumable": {
      const name = requiredString(formData, "name");
      await prisma.consumableItem.create({
        data: {
          name,
          slug: `${slugify(name)}-${Date.now()}`,
          category: requiredString(formData, "category"),
          quantity: numberValue(formData, "quantity", 1),
          unit: requiredString(formData, "unit"),
          reorderThreshold: numberValue(formData, "reorderThreshold", 1),
          storageLocation: optionalString(formData, "storageLocation"),
          notes: optionalString(formData, "notes"),
        },
      });
      break;
    }
    case "safety": {
      const name = requiredString(formData, "name");
      await prisma.safetyEquipment.create({
        data: {
          name,
          slug: `${slugify(name)}-${Date.now()}`,
          type: requiredString(formData, "type"),
          replacementSchedule: optionalString(formData, "replacementSchedule"),
          notes: optionalString(formData, "notes"),
        },
      });
      break;
    }
    case "smart-plug": {
      const name = requiredString(formData, "name");
      await prisma.smartPlug.create({
        data: {
          name,
          slug: `${slugify(name)}-${Date.now()}`,
          assignedDeviceLabel: optionalString(formData, "assignedDeviceLabel"),
          powerMonitoringCapable: formData.get("powerMonitoringCapable") === "on",
          notes: optionalString(formData, "notes"),
        },
      });
      break;
    }
    case "tool": {
      const name = requiredString(formData, "name");
      await prisma.toolPart.create({
        data: {
          name,
          slug: `${slugify(name)}-${Date.now()}`,
          category: requiredString(formData, "category"),
          quantity: numberValue(formData, "quantity", 1),
          storageLocation: optionalString(formData, "storageLocation"),
          notes: optionalString(formData, "notes"),
        },
      });
      break;
    }
    case "wishlist": {
      const name = requiredString(formData, "name");
      await prisma.wishlistItem.create({
        data: {
          name,
          slug: `${slugify(name)}-${Date.now()}`,
          category: requiredString(formData, "category"),
          priority: requiredString(formData, "priority") as WishlistPriority,
          estimatedCost: numberValue(formData, "estimatedCost", 0),
          vendor: optionalString(formData, "vendor"),
          purchaseUrl: optionalString(formData, "purchaseUrl"),
          notes: optionalString(formData, "notes"),
        },
      });
      break;
    }
    default:
      throw new Error(`Unsupported inventory kind: ${kind}`);
  }

  await setFlashMessage({
    type: "success",
    title: "Record created",
    message: "The inventory record was added successfully.",
  });
  revalidateInventory();
}

export async function updateInventoryItem(formData: FormData) {
  const kind = requiredString(formData, "kind");
  const id = requiredString(formData, "id");

  switch (kind) {
    case "printer":
      await prisma.printer.update({
        where: { id },
        data: {
          name: requiredString(formData, "name"),
          brand: requiredString(formData, "brand"),
          model: requiredString(formData, "model"),
          status: requiredString(formData, "status") as
            | "ACTIVE"
            | "MAINTENANCE"
            | "OFFLINE"
            | "ARCHIVED",
          buildVolumeX: numberValue(formData, "buildVolumeX", 180),
          buildVolumeY: numberValue(formData, "buildVolumeY", 180),
          buildVolumeZ: numberValue(formData, "buildVolumeZ", 180),
          location: optionalString(formData, "location"),
          notes: optionalString(formData, "notes"),
        },
      });
      break;
    case "material-system":
      await prisma.materialSystem.update({
        where: { id },
        data: {
          name: requiredString(formData, "name"),
          type: requiredString(formData, "type") as MaterialSystemType,
          status: requiredString(formData, "status") as
            | "ACTIVE"
            | "STANDBY"
            | "MAINTENANCE"
            | "OFFLINE"
            | "ARCHIVED",
          supportedMaterialsNotes: optionalString(formData, "supportedMaterialsNotes"),
          notes: optionalString(formData, "notes"),
        },
      });
      break;
    case "build-plate":
      await prisma.buildPlate.update({
        where: { id },
        data: {
          name: requiredString(formData, "name"),
          sizeLabel: requiredString(formData, "sizeLabel"),
          sizeMm: numberValue(formData, "sizeMm", 256),
          surfaceType: requiredString(formData, "surfaceType"),
          status: requiredString(formData, "status") as
            | "AVAILABLE"
            | "IN_USE"
            | "WORN"
            | "RETIRED",
          notes: optionalString(formData, "notes"),
        },
      });
      break;
    case "hotend":
      await prisma.hotend.update({
        where: { id },
        data: {
          name: requiredString(formData, "name"),
          nozzleSize: numberValue(formData, "nozzleSize", 0.4),
          materialType: requiredString(formData, "materialType"),
          quantity: numberValue(formData, "quantity", 1),
          inUseCount: numberValue(formData, "inUseCount", 0),
          spareCount: numberValue(formData, "spareCount", 0),
          status: requiredString(formData, "status") as
            | "AVAILABLE"
            | "IN_USE"
            | "LOW_STOCK"
            | "RETIRED",
          notes: optionalString(formData, "notes"),
        },
      });
      break;
    case "filament":
      await prisma.filamentSpool.update({
        where: { id },
        data: {
          brand: requiredString(formData, "brand"),
          materialType: requiredString(formData, "materialType"),
          subtype: optionalString(formData, "subtype"),
          finish: optionalString(formData, "finish"),
          color: requiredString(formData, "color"),
          quantity: numberValue(formData, "quantity", 1),
          estimatedRemainingGrams: numberValue(formData, "estimatedRemainingGrams", 1000),
          storageLocation: optionalString(formData, "storageLocation"),
          status: requiredString(formData, "status") as
            | "HEALTHY"
            | "LOW"
            | "OUT"
            | "ARCHIVED",
          opened: booleanValue(formData, "opened"),
          nearlyEmpty: booleanValue(formData, "nearlyEmpty"),
          abrasive: booleanValue(formData, "abrasive"),
          dryingRequired: booleanValue(formData, "dryingRequired"),
          hygroscopicLevel:
            (optionalString(formData, "hygroscopicLevel") as FilamentHygroscopicLevel | null) ??
            null,
          compatibilityTags: booleanValue(formData, "abrasive")
            ? ["Abrasive", "Hardened Nozzle"]
            : booleanValue(formData, "dryingRequired")
              ? ["Dryer Recommended"]
              : ["General Purpose"],
          notes: optionalString(formData, "notes"),
          filamentRecommendation: {
            upsert: {
              create: {
                recommendedNozzle: optionalString(formData, "recommendedNozzle"),
                dryerSuggested: booleanValue(formData, "dryerSuggested"),
                hardenedNozzleNeeded: booleanValue(formData, "hardenedNozzleNeeded"),
                notes: optionalString(formData, "recommendationNotes"),
              },
              update: {
                recommendedNozzle: optionalString(formData, "recommendedNozzle"),
                dryerSuggested: booleanValue(formData, "dryerSuggested"),
                hardenedNozzleNeeded: booleanValue(formData, "hardenedNozzleNeeded"),
                notes: optionalString(formData, "recommendationNotes"),
              },
            },
          },
        },
      });
      break;
    case "consumable":
      await prisma.consumableItem.update({
        where: { id },
        data: {
          name: requiredString(formData, "name"),
          category: requiredString(formData, "category"),
          quantity: numberValue(formData, "quantity", 1),
          unit: requiredString(formData, "unit"),
          reorderThreshold: numberValue(formData, "reorderThreshold", 1),
          status: requiredString(formData, "status") as
            | "HEALTHY"
            | "LOW"
            | "OUT"
            | "ARCHIVED",
          storageLocation: optionalString(formData, "storageLocation"),
          notes: optionalString(formData, "notes"),
        },
      });
      break;
    case "safety":
      await prisma.safetyEquipment.update({
        where: { id },
        data: {
          name: requiredString(formData, "name"),
          type: requiredString(formData, "type"),
          status: requiredString(formData, "status") as
            | "ACTIVE"
            | "NEEDS_ATTENTION"
            | "PLANNED"
            | "ARCHIVED",
          replacementSchedule: optionalString(formData, "replacementSchedule"),
          notes: optionalString(formData, "notes"),
        },
      });
      break;
    case "smart-plug":
      await prisma.smartPlug.update({
        where: { id },
        data: {
          name: requiredString(formData, "name"),
          status: requiredString(formData, "status") as
            | "ONLINE"
            | "OFFLINE"
            | "DISABLED",
          assignedDeviceLabel: optionalString(formData, "assignedDeviceLabel"),
          powerMonitoringCapable: booleanValue(formData, "powerMonitoringCapable"),
          notes: optionalString(formData, "notes"),
        },
      });
      break;
    case "tool":
      await prisma.toolPart.update({
        where: { id },
        data: {
          name: requiredString(formData, "name"),
          category: requiredString(formData, "category"),
          quantity: numberValue(formData, "quantity", 1),
          storageLocation: optionalString(formData, "storageLocation"),
          notes: optionalString(formData, "notes"),
        },
      });
      break;
    case "wishlist":
      await prisma.wishlistItem.update({
        where: { id },
        data: {
          name: requiredString(formData, "name"),
          category: requiredString(formData, "category"),
          priority: requiredString(formData, "priority") as WishlistPriority,
          status: requiredString(formData, "status") as
            | "PLANNED"
            | "RESEARCHING"
            | "READY_TO_BUY"
            | "PURCHASED",
          estimatedCost: numberValue(formData, "estimatedCost", 0),
          vendor: optionalString(formData, "vendor"),
          purchaseUrl: optionalString(formData, "purchaseUrl"),
          notes: optionalString(formData, "notes"),
        },
      });
      break;
    default:
      throw new Error(`Unsupported update kind: ${kind}`);
  }

  await setFlashMessage({
    type: "success",
    title: "Record updated",
    message: "Your changes were saved successfully.",
  });
  revalidateInventory();
}

export async function archiveInventoryItem(formData: FormData) {
  const kind = requiredString(formData, "kind");
  const id = requiredString(formData, "id");

  switch (kind) {
    case "printer":
      await prisma.printer.update({ where: { id }, data: { status: "ARCHIVED" } });
      break;
    case "material-system":
      await prisma.materialSystem.update({ where: { id }, data: { status: "ARCHIVED" } });
      break;
    case "build-plate":
      await prisma.buildPlate.update({ where: { id }, data: { status: "RETIRED" } });
      break;
    case "hotend":
      await prisma.hotend.update({ where: { id }, data: { status: "RETIRED" } });
      break;
    case "filament":
      await prisma.filamentSpool.update({ where: { id }, data: { status: "ARCHIVED" } });
      break;
    case "consumable":
      await prisma.consumableItem.update({ where: { id }, data: { status: "ARCHIVED" } });
      break;
    case "safety":
      await prisma.safetyEquipment.update({ where: { id }, data: { status: "ARCHIVED" } });
      break;
    case "smart-plug":
      await prisma.smartPlug.update({ where: { id }, data: { status: "DISABLED" } });
      break;
    case "tool":
      await prisma.toolPart.delete({ where: { id } });
      break;
    case "wishlist":
      await prisma.wishlistItem.update({ where: { id }, data: { status: "PURCHASED" } });
      break;
    case "maintenance":
      await prisma.maintenanceLog.delete({ where: { id } });
      break;
    default:
      throw new Error(`Unsupported archive kind: ${kind}`);
  }

  await setFlashMessage({
    type: "success",
    title: "Record updated",
    message: "The selected record was updated successfully.",
  });
  revalidateInventory();
}

export async function updateFilamentState(formData: FormData) {
  const id = requiredString(formData, "id");
  const opened = formData.get("opened") === "true";
  const nearlyEmpty = formData.get("nearlyEmpty") === "true";
  const estimatedRemainingGrams = numberValue(formData, "estimatedRemainingGrams", 0);

  await prisma.filamentSpool.update({
    where: { id },
    data: {
      opened,
      nearlyEmpty,
      estimatedRemainingGrams,
      status: estimatedRemainingGrams <= 250 ? StockStatus.LOW : StockStatus.HEALTHY,
    },
  });

  await setFlashMessage({
    type: "success",
    title: "Filament state updated",
    message: "The spool status was updated.",
  });
  revalidatePath("/filament");
  revalidatePath("/");
}

export async function createMaintenanceLog(formData: FormData) {
  const assetType = requiredString(formData, "assetType");
  const assetId = optionalString(formData, "assetId");
  const data = {
    date: new Date(requiredString(formData, "date")),
    actionType: requiredString(formData, "actionType") as MaintenanceActionType,
    actionPerformed: requiredString(formData, "actionPerformed"),
    notes: optionalString(formData, "notes"),
  };

  await prisma.maintenanceLog.create({
    data: {
      ...data,
      ...(assetType === "printer" && assetId ? { printerId: assetId } : {}),
      ...(assetType === "materialSystem" && assetId ? { materialSystemId: assetId } : {}),
      ...(assetType === "buildPlate" && assetId ? { buildPlateId: assetId } : {}),
      ...(assetType === "hotend" && assetId ? { hotendId: assetId } : {}),
      ...(assetType === "safety" && assetId ? { safetyEquipmentId: assetId } : {}),
    },
  });

  await setFlashMessage({
    type: "success",
    title: "Maintenance logged",
    message: "The maintenance event was recorded successfully.",
  });
  revalidatePath("/maintenance");
  revalidatePath("/");
}
