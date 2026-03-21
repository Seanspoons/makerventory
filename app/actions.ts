"use server";

import {
  FilamentHygroscopicLevel,
  ImportEntityType,
  MaterialSystemType,
  MaintenanceActionType,
  Prisma,
  StockStatus,
  WishlistPriority,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { setFlashMessage } from "@/lib/flash";
import { getRequestLogContext, logError, logInfo } from "@/lib/logger";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  applyImportJobRows,
  createImportJobWithRows,
  importFieldConfigs,
  importEntityOptions,
  parseInventoryNotes,
  readCsvFile,
  stageImportRecords,
} from "@/lib/imports";
import { prisma } from "@/lib/prisma";
import {
  assertRateLimit,
  createPasswordResetToken,
  getClientIdentifier,
  hashToken,
  RateLimitError,
} from "@/lib/security";
import {
  changePasswordSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  signUpSchema,
  updateProfileSchema,
  updateWorkspaceSchema,
} from "@/lib/validation";
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

function emailValue(formData: FormData, key: string) {
  return requiredString(formData, key).toLowerCase();
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const raw = formData.get(key);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function revalidateInventory() {
  [
    "/dashboard",
    "/imports",
    "/audit",
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

function importEntityValue(formData: FormData, key = "entityType") {
  const value = requiredString(formData, key);
  const allowed = new Set(importEntityOptions.map((option) => option.value));
  if (!allowed.has(value as ImportEntityType)) {
    throw new Error("Unsupported import entity type.");
  }

  return value as ImportEntityType;
}

function booleanValue(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function summarizeImportRows(rows: Array<{ status: string }>) {
  return {
    newRows: rows.filter((item) => item.status === "NEW").length,
    matchedRows: rows.filter((item) => item.status === "MATCHED").length,
    conflictRows: rows.filter((item) => item.status === "CONFLICT").length,
    skippedRows: rows.filter((item) => item.status === "SKIPPED" || item.status === "ERROR").length,
  };
}

async function getWorkspaceContext() {
  const session = await requireSession();
  return {
    userId: session.user.id,
    workspaceId: session.user.workspaceId,
  };
}

async function uniqueWorkspaceSlug(name: string) {
  const base = slugify(name) || "workspace";
  const existing = await prisma.workspace.count({
    where: {
      slug: {
        startsWith: base,
      },
    },
  });

  return existing === 0 ? base : `${base}-${existing + 1}`;
}

async function logAuditEvent(args: {
  workspaceId: string;
  userId?: string | null;
  actionType: "CREATE" | "UPDATE" | "ARCHIVE" | "VOID" | "IMPORT_STAGE" | "IMPORT_APPLY";
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  summary: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.auditEvent.create({
    data: {
      workspaceId: args.workspaceId,
      actorUserId: args.userId ?? null,
      actionType: args.actionType,
      entityType: args.entityType,
      entityId: args.entityId ?? null,
      entityLabel: args.entityLabel ?? null,
      summary: args.summary,
      metadata: args.metadata,
    },
  });
}

async function assertOwnedRecord(kind: string, id: string, workspaceId: string) {
  switch (kind) {
    case "printer":
      return prisma.printer.findFirst({ where: { id, workspaceId }, select: { id: true } });
    case "material-system":
      return prisma.materialSystem.findFirst({ where: { id, workspaceId }, select: { id: true } });
    case "build-plate":
      return prisma.buildPlate.findFirst({ where: { id, workspaceId }, select: { id: true } });
    case "hotend":
      return prisma.hotend.findFirst({ where: { id, workspaceId }, select: { id: true } });
    case "filament":
      return prisma.filamentSpool.findFirst({ where: { id, workspaceId }, select: { id: true } });
    case "consumable":
      return prisma.consumableItem.findFirst({ where: { id, workspaceId }, select: { id: true } });
    case "safety":
      return prisma.safetyEquipment.findFirst({ where: { id, workspaceId }, select: { id: true } });
    case "smart-plug":
      return prisma.smartPlug.findFirst({ where: { id, workspaceId }, select: { id: true } });
    case "tool":
      return prisma.toolPart.findFirst({ where: { id, workspaceId }, select: { id: true } });
    case "wishlist":
      return prisma.wishlistItem.findFirst({ where: { id, workspaceId }, select: { id: true } });
    case "maintenance":
      return prisma.maintenanceLog.findFirst({ where: { id, workspaceId }, select: { id: true } });
    default:
      return null;
  }
}

export async function createInventoryItem(formData: FormData) {
  const kind = requiredString(formData, "kind");
  const { userId, workspaceId } = await getWorkspaceContext();
  let createdId: string | null = null;
  let createdLabel: string | null = null;

  switch (kind) {
    case "printer": {
      const name = requiredString(formData, "name");
      const printer = await prisma.printer.create({
        data: {
          workspaceId,
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
      createdId = printer.id;
      createdLabel = printer.name;
      break;
    }
    case "material-system": {
      const name = requiredString(formData, "name");
      const materialSystem = await prisma.materialSystem.create({
        data: {
          workspaceId,
          name,
          slug: `${slugify(name)}-${Date.now()}`,
          type: requiredString(formData, "type") as MaterialSystemType,
          supportedMaterialsNotes: optionalString(formData, "supportedMaterialsNotes"),
          notes: optionalString(formData, "notes"),
        },
      });
      createdId = materialSystem.id;
      createdLabel = materialSystem.name;
      break;
    }
    case "build-plate": {
      const name = requiredString(formData, "name");
      const buildPlate = await prisma.buildPlate.create({
        data: {
          workspaceId,
          name,
          slug: `${slugify(name)}-${Date.now()}`,
          sizeLabel: requiredString(formData, "sizeLabel"),
          sizeMm: numberValue(formData, "sizeMm", 256),
          surfaceType: requiredString(formData, "surfaceType"),
          notes: optionalString(formData, "notes"),
        },
      });
      createdId = buildPlate.id;
      createdLabel = buildPlate.name;
      break;
    }
    case "hotend": {
      const name = requiredString(formData, "name");
      const quantity = numberValue(formData, "quantity", 1);
      const hotend = await prisma.hotend.create({
        data: {
          workspaceId,
          name,
          slug: `${slugify(name)}-${Date.now()}`,
          nozzleSize: numberValue(formData, "nozzleSize", 0.4),
          materialType: requiredString(formData, "materialType"),
          quantity,
          spareCount: Math.max(0, quantity),
          notes: optionalString(formData, "notes"),
        },
      });
      createdId = hotend.id;
      createdLabel = hotend.name;
      break;
    }
    case "filament": {
      const brand = requiredString(formData, "brand");
      const materialType = requiredString(formData, "materialType");
      const color = requiredString(formData, "color");
      const abrasive = formData.get("abrasive") === "on";
      const dryingRequired = formData.get("dryingRequired") === "on";
      const filament = await prisma.filamentSpool.create({
        data: {
          workspaceId,
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
      createdId = filament.id;
      createdLabel = `${filament.brand} ${filament.color} ${filament.materialType}`;
      break;
    }
    case "consumable": {
      const name = requiredString(formData, "name");
      const consumable = await prisma.consumableItem.create({
        data: {
          workspaceId,
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
      createdId = consumable.id;
      createdLabel = consumable.name;
      break;
    }
    case "safety": {
      const name = requiredString(formData, "name");
      const safety = await prisma.safetyEquipment.create({
        data: {
          workspaceId,
          name,
          slug: `${slugify(name)}-${Date.now()}`,
          type: requiredString(formData, "type"),
          replacementSchedule: optionalString(formData, "replacementSchedule"),
          notes: optionalString(formData, "notes"),
        },
      });
      createdId = safety.id;
      createdLabel = safety.name;
      break;
    }
    case "smart-plug": {
      const name = requiredString(formData, "name");
      const smartPlug = await prisma.smartPlug.create({
        data: {
          workspaceId,
          name,
          slug: `${slugify(name)}-${Date.now()}`,
          assignedDeviceLabel: optionalString(formData, "assignedDeviceLabel"),
          powerMonitoringCapable: formData.get("powerMonitoringCapable") === "on",
          notes: optionalString(formData, "notes"),
        },
      });
      createdId = smartPlug.id;
      createdLabel = smartPlug.name;
      break;
    }
    case "tool": {
      const name = requiredString(formData, "name");
      const tool = await prisma.toolPart.create({
        data: {
          workspaceId,
          name,
          slug: `${slugify(name)}-${Date.now()}`,
          category: requiredString(formData, "category"),
          quantity: numberValue(formData, "quantity", 1),
          storageLocation: optionalString(formData, "storageLocation"),
          notes: optionalString(formData, "notes"),
        },
      });
      createdId = tool.id;
      createdLabel = tool.name;
      break;
    }
    case "wishlist": {
      const name = requiredString(formData, "name");
      const wishlistItem = await prisma.wishlistItem.create({
        data: {
          workspaceId,
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
      createdId = wishlistItem.id;
      createdLabel = wishlistItem.name;
      break;
    }
    default:
      throw new Error(`Unsupported inventory kind: ${kind}`);
  }

  await logAuditEvent({
    workspaceId,
    userId,
    actionType: "CREATE",
    entityType: kind,
    entityId: createdId,
    entityLabel: createdLabel,
    summary: `Created ${kind} record${createdLabel ? `: ${createdLabel}` : ""}.`,
  });

  await setFlashMessage({
    type: "success",
    title: "Record created",
    message: "The inventory record was added successfully.",
  });
  revalidateInventory();
}

export async function signUpUser(formData: FormData) {
  try {
    const logContext = await getRequestLogContext();
    const parsed = signUpSchema.safeParse({
      name: formData.get("name"),
      workspaceName: formData.get("workspaceName"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) {
      logInfo("auth.sign_up_validation_failed", logContext);
      await setFlashMessage({
        type: "error",
        title: "Check your sign-up details",
        message: parsed.error.issues[0]?.message ?? "Check the sign-up form and try again.",
      });
      redirect("/sign-up");
    }

    const { name, workspaceName, email, password } = parsed.data;
    const clientIp = await getClientIdentifier();
    await assertRateLimit({
      action: "auth:sign-up",
      identifier: `${clientIp}:${email}`,
      limit: 5,
      windowMinutes: 30,
    });

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      await setFlashMessage({
        type: "error",
        title: "Account already exists",
        message: "Use a different email or sign in to your existing account.",
      });
      redirect("/sign-up");
    }

    const passwordHash = await hashPassword(password);
    const workspaceSlug = await uniqueWorkspaceSlug(workspaceName);

    await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          slug: workspaceSlug,
          description: `${workspaceName} workspace`,
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          activeWorkspaceId: workspace.id,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      await tx.auditEvent.create({
        data: {
          workspaceId: workspace.id,
          actorUserId: user.id,
          actionType: "CREATE",
          entityType: "workspace",
          entityId: workspace.id,
          entityLabel: workspace.name,
          summary: "Created workspace during signup.",
        },
      });
    });

    await setFlashMessage({
      type: "success",
      title: "Account created",
      message: "Sign in with your new credentials to start adding your inventory.",
    });
    logInfo("auth.sign_up_succeeded", {
      ...logContext,
      workspaceSlug,
      emailDomain: email.split("@")[1] ?? "unknown",
    });
  } catch (error) {
    logError("auth.sign_up_failed", error, await getRequestLogContext());
    if (error instanceof RateLimitError) {
      await setFlashMessage({
        type: "error",
        title: "Too many sign-up attempts",
        message: error.message,
      });
      redirect("/sign-up");
    }

    throw error;
  }

  redirect("/sign-in");
}

export async function updateInventoryItem(formData: FormData) {
  const kind = requiredString(formData, "kind");
  const id = requiredString(formData, "id");
  const { userId, workspaceId } = await getWorkspaceContext();
  const owned = await assertOwnedRecord(kind, id, workspaceId);

  if (!owned) {
    throw new Error("Unauthorized");
  }

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

  const updatedLabelParts = [
    optionalString(formData, "brand"),
    optionalString(formData, "color"),
    optionalString(formData, "materialType"),
  ].filter(Boolean);
  const updatedLabel =
    optionalString(formData, "name") ??
    (updatedLabelParts.length > 0 ? updatedLabelParts.join(" ") : id);

  await logAuditEvent({
    workspaceId,
    userId,
    actionType: "UPDATE",
    entityType: kind,
    entityId: id,
    entityLabel: updatedLabel,
    summary: `Updated ${kind} record${updatedLabel ? `: ${updatedLabel}` : ""}.`,
  });

  await setFlashMessage({
    type: "success",
    title: "Record updated",
    message: "Your changes were saved successfully.",
  });
  revalidateInventory();
}

export async function updateAccountProfile(formData: FormData) {
  const { userId, workspaceId } = await getWorkspaceContext();
  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    await setFlashMessage({
      type: "error",
      title: "Profile update failed",
      message: parsed.error.issues[0]?.message ?? "Check the form and try again.",
    });
    redirect("/account");
  }

  const { name, email } = parsed.data;

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  const existingUser = await prisma.user.findFirst({
    where: {
      email,
      id: { not: userId },
    },
    select: { id: true },
  });

  if (existingUser) {
    await setFlashMessage({
      type: "error",
      title: "Email unavailable",
      message: "That email address is already assigned to another account.",
    });
    redirect("/account");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      email,
    },
  });

  await logAuditEvent({
    workspaceId,
    userId,
    actionType: "UPDATE",
    entityType: "account",
    entityId: userId,
    entityLabel: name,
    summary: "Updated account profile details.",
    metadata: {
      previousName: currentUser?.name ?? null,
      previousEmail: currentUser?.email ?? null,
      nextName: name,
      nextEmail: email,
    },
  });

  await setFlashMessage({
    type: "success",
    title: "Profile updated",
    message: "Your account profile was saved.",
  });
  revalidatePath("/account");
}

export async function updateWorkspaceProfile(formData: FormData) {
  const { userId, workspaceId } = await getWorkspaceContext();
  const parsed = updateWorkspaceSchema.safeParse({
    workspaceName: formData.get("workspaceName"),
  });

  if (!parsed.success) {
    await setFlashMessage({
      type: "error",
      title: "Workspace update failed",
      message: parsed.error.issues[0]?.message ?? "Check the workspace form and try again.",
    });
    redirect("/account");
  }

  const { workspaceName } = parsed.data;
  const currentWorkspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true },
  });

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      name: workspaceName,
    },
  });

  await logAuditEvent({
    workspaceId,
    userId,
    actionType: "UPDATE",
    entityType: "workspace",
    entityId: workspaceId,
    entityLabel: workspaceName,
    summary: "Updated workspace settings.",
    metadata: {
      previousName: currentWorkspace?.name ?? null,
      nextName: workspaceName,
    },
  });

  await setFlashMessage({
    type: "success",
    title: "Workspace updated",
    message: "The workspace name was saved.",
  });
  revalidatePath("/account");
  revalidatePath("/dashboard");
}

export async function changeAccountPassword(formData: FormData) {
  try {
    const { userId, workspaceId } = await getWorkspaceContext();
    const parsed = changePasswordSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      nextPassword: formData.get("nextPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) {
      await setFlashMessage({
        type: "error",
        title: "Password update failed",
        message: parsed.error.issues[0]?.message ?? "Check the password fields and try again.",
      });
      redirect("/account");
    }

    const { currentPassword, nextPassword } = parsed.data;

    const clientIp = await getClientIdentifier();
    await assertRateLimit({
      action: "auth:change-password",
      identifier: `${clientIp}:${userId}`,
      limit: 8,
      windowMinutes: 30,
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, name: true },
    });

    if (!user?.passwordHash || !(await verifyPassword(currentPassword, user.passwordHash))) {
      await setFlashMessage({
        type: "error",
        title: "Current password is incorrect",
        message: "Enter your existing password to make this change.",
      });
      redirect("/account");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(nextPassword),
        sessionVersion: {
          increment: 1,
        },
      },
    });

    await logAuditEvent({
      workspaceId,
      userId,
      actionType: "UPDATE",
      entityType: "account",
      entityId: userId,
      entityLabel: user.name ?? null,
      summary: "Changed account password.",
      metadata: {
        action: "password-change",
      },
    });

    await setFlashMessage({
      type: "success",
      title: "Password updated",
      message: "Your password has been changed.",
    });
    revalidatePath("/account");
  } catch (error) {
    if (error instanceof RateLimitError) {
      await setFlashMessage({
        type: "error",
        title: "Too many password change attempts",
        message: error.message,
      });
      redirect("/account");
    }

    throw error;
  }
}

export async function requestPasswordReset(formData: FormData) {
  try {
    const parsed = requestPasswordResetSchema.safeParse({
      email: formData.get("email"),
    });

    if (!parsed.success) {
      await setFlashMessage({
        type: "error",
        title: "Reset request failed",
        message: parsed.error.issues[0]?.message ?? "Check the email address and try again.",
      });
      redirect("/forgot-password");
    }

    const { email } = parsed.data;
    const clientIp = await getClientIdentifier();
    await assertRateLimit({
      action: "auth:password-reset-request",
      identifier: `${clientIp}:${email}`,
      limit: 5,
      windowMinutes: 30,
    });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, isActive: true, activeWorkspaceId: true },
    });

    if (user?.isActive && user.activeWorkspaceId) {
      const rawToken = createPasswordResetToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      if (process.env.ALLOW_INSECURE_DEV_RESET_LINKS === "true") {
        await setFlashMessage({
          type: "success",
          title: "Reset link generated",
          message: `Open /reset-password?token=${rawToken} to continue.`,
        });
      } else {
        await setFlashMessage({
          type: "success",
          title: "If that account exists, a reset email would be sent",
          message: "Check your email for the password reset link.",
        });
      }
    } else {
      await setFlashMessage({
        type: "success",
        title: "If that account exists, a reset email would be sent",
        message: "Check your email for the password reset link.",
      });
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      await setFlashMessage({
        type: "error",
        title: "Too many reset requests",
        message: error.message,
      });
      redirect("/forgot-password");
    }

    throw error;
  }

  redirect("/forgot-password");
}

export async function resetPassword(formData: FormData) {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    await setFlashMessage({
      type: "error",
      title: "Reset failed",
      message: parsed.error.issues[0]?.message ?? "Check the form and try again.",
    });
    redirect("/forgot-password");
  }

  const clientIp = await getClientIdentifier();
  await assertRateLimit({
    action: "auth:password-reset-confirm",
    identifier: clientIp,
    limit: 8,
    windowMinutes: 30,
  });

  const tokenHash = hashToken(parsed.data.token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          activeWorkspaceId: true,
        },
      },
    },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    await setFlashMessage({
      type: "error",
      title: "Reset link is invalid",
      message: "Request a new password reset link and try again.",
    });
    redirect("/forgot-password");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash: await hashPassword(parsed.data.password),
        sessionVersion: {
          increment: 1,
        },
      },
    });

    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: {
        usedAt: new Date(),
      },
    });

    if (resetToken.user.activeWorkspaceId) {
      await tx.auditEvent.create({
        data: {
          workspaceId: resetToken.user.activeWorkspaceId,
          actorUserId: resetToken.userId,
          actionType: "UPDATE",
          entityType: "account",
          entityId: resetToken.userId,
          entityLabel: resetToken.user.name ?? null,
          summary: "Completed password reset.",
          metadata: {
            action: "password-reset",
          },
        },
      });
    }
  });

  await setFlashMessage({
    type: "success",
    title: "Password reset complete",
    message: "Sign in with your new password.",
  });
  redirect("/sign-in");
}

export async function revokeAllSessions() {
  const { userId, workspaceId } = await getWorkspaceContext();

  await prisma.user.update({
    where: { id: userId },
    data: {
      sessionVersion: {
        increment: 1,
      },
    },
  });

  await logAuditEvent({
    workspaceId,
    userId,
    actionType: "UPDATE",
    entityType: "account",
    entityId: userId,
    summary: "Revoked all active sessions.",
    metadata: {
      action: "revoke-all-sessions",
    },
  });

  await setFlashMessage({
    type: "success",
    title: "Sessions revoked",
    message: "Sign in again on this device to continue.",
  });
  redirect("/sign-in");
}

export async function archiveInventoryItem(formData: FormData) {
  const kind = requiredString(formData, "kind");
  const id = requiredString(formData, "id");
  const { userId, workspaceId } = await getWorkspaceContext();
  const owned = await assertOwnedRecord(kind, id, workspaceId);

  if (!owned) {
    throw new Error("Unauthorized");
  }

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
      await prisma.toolPart.update({ where: { id }, data: { archivedAt: new Date() } });
      break;
    case "wishlist":
      await prisma.wishlistItem.update({ where: { id }, data: { status: "PURCHASED" } });
      break;
    case "maintenance":
      await prisma.maintenanceLog.update({
        where: { id },
        data: {
          voidedAt: new Date(),
          voidReason: "Voided from the maintenance log workflow.",
        },
      });
      break;
    default:
      throw new Error(`Unsupported archive kind: ${kind}`);
  }

  await logAuditEvent({
    workspaceId,
    userId,
    actionType: kind === "maintenance" ? "VOID" : "ARCHIVE",
    entityType: kind,
    entityId: id,
    summary:
      kind === "maintenance"
        ? "Voided maintenance log entry."
        : `Archived ${kind} record.`,
  });

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
  const { userId, workspaceId } = await getWorkspaceContext();
  const owned = await assertOwnedRecord("filament", id, workspaceId);

  if (!owned) {
    throw new Error("Unauthorized");
  }

  await prisma.filamentSpool.update({
    where: { id },
    data: {
      opened,
      nearlyEmpty,
      estimatedRemainingGrams,
      status: estimatedRemainingGrams <= 250 ? StockStatus.LOW : StockStatus.HEALTHY,
    },
  });

  await logAuditEvent({
    workspaceId,
    userId,
    actionType: "UPDATE",
    entityType: "filament",
    entityId: id,
    summary: "Updated filament operating state.",
    metadata: {
      opened,
      nearlyEmpty,
      estimatedRemainingGrams,
    },
  });

  await setFlashMessage({
    type: "success",
    title: "Filament state updated",
    message: "The spool status was updated.",
  });
  revalidatePath("/filament");
  revalidatePath("/dashboard");
}

export async function createMaintenanceLog(formData: FormData) {
  const assetType = requiredString(formData, "assetType");
  const assetId = optionalString(formData, "assetId");
  const { userId, workspaceId } = await getWorkspaceContext();
  const data = {
    date: new Date(requiredString(formData, "date")),
    actionType: requiredString(formData, "actionType") as MaintenanceActionType,
    actionPerformed: requiredString(formData, "actionPerformed"),
    notes: optionalString(formData, "notes"),
  };

  const maintenanceLog = await prisma.maintenanceLog.create({
    data: {
      workspaceId,
      ...data,
      ...(assetType === "printer" && assetId ? { printerId: assetId } : {}),
      ...(assetType === "materialSystem" && assetId ? { materialSystemId: assetId } : {}),
      ...(assetType === "buildPlate" && assetId ? { buildPlateId: assetId } : {}),
      ...(assetType === "hotend" && assetId ? { hotendId: assetId } : {}),
      ...(assetType === "safety" && assetId ? { safetyEquipmentId: assetId } : {}),
    },
  });

  await logAuditEvent({
    workspaceId,
    userId,
    actionType: "CREATE",
    entityType: "maintenance",
    entityId: maintenanceLog.id,
    entityLabel: data.actionPerformed,
    summary: `Logged maintenance action: ${data.actionPerformed}.`,
    metadata: {
      assetType,
      assetId,
      actionType: data.actionType,
    },
  });

  await setFlashMessage({
    type: "success",
    title: "Maintenance logged",
    message: "The maintenance event was recorded successfully.",
  });
  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
}

export async function stageImportJob(formData: FormData) {
  const { userId, workspaceId } = await getWorkspaceContext();
  const logContext = await getRequestLogContext({ userId, workspaceId });
  const entityType = importEntityValue(formData);
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new Error("A CSV file is required.");
  }

  const sourceName = optionalString(formData, "sourceName") ?? file.name.replace(/\.csv$/i, "");
  const notes = optionalString(formData, "notes");
  const fieldMapping = Object.fromEntries(
    importFieldConfigs[entityType]
      .map((field) => {
        const value = optionalString(formData, `mapping:${field.key}`);
        return value ? [field.key, value] : null;
      })
      .filter((entry): entry is [string, string] => Boolean(entry)),
  );
  const records = await readCsvFile(file);
  const rows = await stageImportRecords(workspaceId, entityType, records, fieldMapping);

  const job = await createImportJobWithRows({
    workspaceId,
    userId,
    entityType,
    sourceName,
    originalFilename: file.name,
    notes,
    fieldMapping,
    rows,
  });

  await logAuditEvent({
    workspaceId,
    userId,
    actionType: "IMPORT_STAGE",
    entityType,
    entityId: job.id,
    entityLabel: sourceName,
    summary: `Staged ${job.totalRows} row(s) for ${entityType.toLowerCase().replace("_", " ")} import.`,
    metadata: {
      originalFilename: file.name,
      totalRows: job.totalRows,
      conflictRows: job.conflictRows,
      skippedRows: job.skippedRows,
    },
  });

  await setFlashMessage({
    type: "success",
    title: "Import staged",
    message: `${job.totalRows} row(s) staged for review before apply.`,
  });
  logInfo("imports.stage_succeeded", {
    ...logContext,
    importJobId: job.id,
    entityType,
    totalRows: job.totalRows,
  });
  revalidatePath("/imports");
}

export async function stageInventoryNotesImport(formData: FormData) {
  const { userId, workspaceId } = await getWorkspaceContext();
  const logContext = await getRequestLogContext({ userId, workspaceId });
  const notesText = requiredString(formData, "notesText");
  const sourceLabel = optionalString(formData, "sourceName") ?? "Notes paste";

  const groups = parseInventoryNotes(notesText);
  if (groups.length === 0) {
    await setFlashMessage({
      type: "error",
      title: "Nothing to stage",
      message: "No supported inventory sections were found in the pasted notes.",
    });
    revalidatePath("/imports");
    return;
  }

  const jobs = [];
  for (const group of groups) {
    const rows = await stageImportRecords(workspaceId, group.entityType, group.records);
    const job = await createImportJobWithRows({
      workspaceId,
      userId,
      entityType: group.entityType,
      sourceName: `${sourceLabel} · ${group.sourceName}`,
      originalFilename: "notes-paste.txt",
      notes: "Staged from pasted inventory notes.",
      rows,
    });
    jobs.push(job);

    await logAuditEvent({
      workspaceId,
      userId,
      actionType: "IMPORT_STAGE",
      entityType: group.entityType,
      entityId: job.id,
      entityLabel: job.sourceName,
      summary: `Staged ${job.totalRows} row(s) from pasted notes for ${group.entityType.toLowerCase().replaceAll("_", " ")}.`,
      metadata: {
        source: "notes-paste",
        totalRows: job.totalRows,
      },
    });
  }

  await setFlashMessage({
    type: "success",
    title: "Notes import staged",
    message: `${jobs.length} staged import job(s) were created from the pasted notes.`,
  });
  logInfo("imports.notes_stage_succeeded", {
    ...logContext,
    stagedJobs: jobs.length,
    entityTypes: jobs.map((job) => job.entityType),
  });
  revalidatePath("/imports");
}

export async function applyStagedImport(formData: FormData) {
  const { userId, workspaceId } = await getWorkspaceContext();
  const logContext = await getRequestLogContext({ userId, workspaceId });
  const jobId = requiredString(formData, "jobId");

  const job = await applyImportJobRows(jobId, workspaceId);

  await logAuditEvent({
    workspaceId,
    userId,
    actionType: "IMPORT_APPLY",
    entityType: job.entityType,
    entityId: job.id,
    entityLabel: job.sourceName,
    summary: `Applied staged ${job.entityType.toLowerCase().replace("_", " ")} import.`,
    metadata: {
      appliedAt: job.appliedAt?.toISOString() ?? null,
    },
  });

  await setFlashMessage({
    type: "success",
    title: "Import applied",
    message: `${job.entityType.toLowerCase().replace("_", " ")} records were written to inventory.`,
  });
  logInfo("imports.apply_succeeded", {
    ...logContext,
    importJobId: job.id,
    entityType: job.entityType,
  });
  revalidateInventory();
}

export async function updateImportRowDecision(formData: FormData) {
  const { userId, workspaceId } = await getWorkspaceContext();
  const rowId = requiredString(formData, "rowId");
  const decision = requiredString(formData, "decision");

  if (!["skip", "retry"].includes(decision)) {
    throw new Error("Unsupported import row decision.");
  }

  const row = await prisma.importRow.findFirst({
    where: { id: rowId, workspaceId },
    include: {
      importJob: true,
    },
  });

  if (!row) {
    throw new Error("Import row not found.");
  }

  if (row.importJob.status !== "STAGED") {
    throw new Error("Only staged imports can be edited.");
  }

  const nextStatus =
    decision === "skip"
      ? "SKIPPED"
      : row.validationErrors.length > 0
        ? "ERROR"
        : row.suggestedMatchId
          ? "MATCHED"
          : "NEW";
  const nextResolution =
    decision === "skip"
      ? "SKIP"
      : row.suggestedMatchId
        ? "UPDATE_MATCH"
        : "CREATE_NEW";

  await prisma.importRow.update({
    where: { id: rowId },
    data: {
      status: nextStatus,
      resolution: nextResolution,
      resolvedMatchId: nextResolution === "UPDATE_MATCH" ? row.suggestedMatchId : null,
      resolvedMatchSlug: nextResolution === "UPDATE_MATCH" ? row.suggestedMatchSlug : null,
    },
  });

  const rows = await prisma.importRow.findMany({
    where: { importJobId: row.importJobId },
    select: { status: true },
  });

  await prisma.importJob.update({
    where: { id: row.importJobId },
    data: summarizeImportRows(rows),
  });

  await logAuditEvent({
    workspaceId,
    userId,
    actionType: "UPDATE",
    entityType: "import-row",
    entityId: rowId,
    entityLabel: row.importJob.sourceName,
    summary: decision === "skip" ? "Skipped staged import row." : "Re-queued staged import row.",
    metadata: {
      importJobId: row.importJobId,
      rowIndex: row.rowIndex,
      nextStatus,
      nextResolution,
    },
  });

  await setFlashMessage({
    type: "success",
    title: decision === "skip" ? "Row skipped" : "Row restored",
    message:
      decision === "skip"
        ? "The staged row will not be applied."
        : "The staged row is back in the apply queue if it is valid.",
  });
  revalidatePath("/imports");
}

export async function updateImportRowResolution(formData: FormData) {
  const { userId, workspaceId } = await getWorkspaceContext();
  const logContext = await getRequestLogContext({ userId, workspaceId });
  const rowId = requiredString(formData, "rowId");
  const resolution = requiredString(formData, "resolution");

  if (!["CREATE_NEW", "UPDATE_MATCH", "SKIP"].includes(resolution)) {
    throw new Error("Unsupported import row resolution.");
  }

  const row = await prisma.importRow.findFirst({
    where: { id: rowId, workspaceId },
    include: {
      importJob: true,
    },
  });

  if (!row) {
    throw new Error("Import row not found.");
  }

  if (row.importJob.status !== "STAGED") {
    throw new Error("Only staged imports can be edited.");
  }

  if (resolution === "UPDATE_MATCH" && !row.suggestedMatchId) {
    throw new Error("This row does not have a suggested match.");
  }

  const nextStatus =
    resolution === "SKIP"
      ? row.validationErrors.length > 0
        ? "ERROR"
        : "SKIPPED"
      : row.validationErrors.length > 0
        ? "ERROR"
        : resolution === "UPDATE_MATCH"
          ? "MATCHED"
          : "NEW";

  await prisma.importRow.update({
    where: { id: rowId },
    data: {
      resolution: resolution as "CREATE_NEW" | "UPDATE_MATCH" | "SKIP",
      status: nextStatus,
      resolvedMatchId: resolution === "UPDATE_MATCH" ? row.suggestedMatchId : null,
      resolvedMatchSlug: resolution === "UPDATE_MATCH" ? row.suggestedMatchSlug : null,
    },
  });

  const rows = await prisma.importRow.findMany({
    where: { importJobId: row.importJobId },
    select: { status: true },
  });

  await prisma.importJob.update({
    where: { id: row.importJobId },
    data: summarizeImportRows(rows),
  });

  await logAuditEvent({
    workspaceId,
    userId,
    actionType: "UPDATE",
    entityType: "import-row",
    entityId: rowId,
    entityLabel: row.importJob.sourceName,
    summary: `Changed staged row resolution to ${resolution.toLowerCase().replace("_", " ")}.`,
    metadata: {
      importJobId: row.importJobId,
      rowIndex: row.rowIndex,
      resolution,
      nextStatus,
    },
  });

  await setFlashMessage({
    type: "success",
    title: "Row resolution updated",
    message:
      resolution === "SKIP"
        ? "This row will stay out of the apply set."
        : resolution === "UPDATE_MATCH"
          ? "This row is set to update the suggested match."
          : "This row is set to create a new record.",
  });
  logInfo("imports.row_resolution_updated", {
    ...logContext,
    rowId,
    resolution,
    importJobId: row.importJobId,
  });
  revalidatePath("/imports");
}
