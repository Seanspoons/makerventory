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
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  applyImportJobRows,
  createImportJobWithRows,
  importEntityOptions,
  readCsvFile,
  stageImportRecords,
} from "@/lib/imports";
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
    "/",
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
  const name = requiredString(formData, "name");
  const workspaceName = requiredString(formData, "workspaceName");
  const email = emailValue(formData, "email");
  const password = requiredString(formData, "password");
  const confirmPassword = requiredString(formData, "confirmPassword");

  if (password.length < 12) {
    await setFlashMessage({
      type: "error",
      title: "Password too short",
      message: "Use at least 12 characters for your account password.",
    });
    redirect("/sign-up");
  }

  if (password !== confirmPassword) {
    await setFlashMessage({
      type: "error",
      title: "Passwords do not match",
      message: "Re-enter the password confirmation and try again.",
    });
    redirect("/sign-up");
  }

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
  const name = requiredString(formData, "name");
  const email = emailValue(formData, "email");

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
  const workspaceName = requiredString(formData, "workspaceName");

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
  });

  await setFlashMessage({
    type: "success",
    title: "Workspace updated",
    message: "The workspace name was saved.",
  });
  revalidatePath("/account");
  revalidatePath("/");
}

export async function changeAccountPassword(formData: FormData) {
  const { userId, workspaceId } = await getWorkspaceContext();
  const currentPassword = requiredString(formData, "currentPassword");
  const nextPassword = requiredString(formData, "nextPassword");
  const confirmPassword = requiredString(formData, "confirmPassword");

  if (nextPassword.length < 12) {
    await setFlashMessage({
      type: "error",
      title: "Password too short",
      message: "Use at least 12 characters for the new password.",
    });
    redirect("/account");
  }

  if (nextPassword !== confirmPassword) {
    await setFlashMessage({
      type: "error",
      title: "Passwords do not match",
      message: "Re-enter the new password confirmation and try again.",
    });
    redirect("/account");
  }

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
  });

  await setFlashMessage({
    type: "success",
    title: "Password updated",
    message: "Your password has been changed.",
  });
  revalidatePath("/account");
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
  revalidatePath("/");
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
  revalidatePath("/");
}

export async function stageImportJob(formData: FormData) {
  const { userId, workspaceId } = await getWorkspaceContext();
  const entityType = importEntityValue(formData);
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new Error("A CSV file is required.");
  }

  const sourceName = optionalString(formData, "sourceName") ?? file.name.replace(/\.csv$/i, "");
  const notes = optionalString(formData, "notes");
  const records = await readCsvFile(file);
  const rows = await stageImportRecords(workspaceId, entityType, records);

  const job = await createImportJobWithRows({
    workspaceId,
    userId,
    entityType,
    sourceName,
    originalFilename: file.name,
    notes,
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
  revalidatePath("/imports");
}

export async function applyStagedImport(formData: FormData) {
  const { userId, workspaceId } = await getWorkspaceContext();
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
  revalidateInventory();
}
