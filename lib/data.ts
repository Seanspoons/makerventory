import {
  ImportEntityType,
  Prisma,
  StockStatus,
  WishlistPriority,
  WishlistStatus,
} from "@prisma/client";
import { subDays } from "date-fns";
import { cache } from "react";
import { requireSession } from "@/lib/auth";
import { buildImportRowReview } from "@/lib/import-review";
import { prisma } from "@/lib/prisma";
import { deriveConsumableStatus } from "@/lib/utils";

const getWorkspaceId = cache(async () => {
  const session = await requireSession();
  return session.user.workspaceId;
});

export async function getDashboardData() {
  const workspaceId = await getWorkspaceId();
  const [
    totalPrinters,
    activePrinters,
    totalFilamentSpools,
    lowStockFilament,
    consumables,
    wishlistCount,
    maintenanceCount,
    recentMaintenance,
    smartPlugs,
    safetyEquipment,
    printers,
    materialSystems,
    buildPlates,
    hotends,
    tools,
    filamentByMaterial,
    wishlistByPriority,
    stagedImportJobs,
  ] = await Promise.all([
    prisma.printer.count({ where: { workspaceId } }),
    prisma.printer.count({ where: { workspaceId, status: "ACTIVE" } }),
    prisma.filamentSpool.aggregate({ where: { workspaceId }, _sum: { quantity: true } }),
    prisma.filamentSpool.findMany({
      where: {
        workspaceId,
        OR: [{ status: StockStatus.LOW }, { nearlyEmpty: true }],
      },
      orderBy: [{ nearlyEmpty: "desc" }, { estimatedRemainingGrams: "asc" }],
      take: 8,
    }),
    prisma.consumableItem.findMany({
      where: { workspaceId },
      orderBy: [{ status: "desc" }, { quantity: "asc" }],
    }),
    prisma.wishlistItem.count({
      where: {
        workspaceId,
        status: {
          not: WishlistStatus.PURCHASED,
        },
      },
    }),
    prisma.maintenanceLog.count({
      where: {
        workspaceId,
        voidedAt: null,
        date: {
          gte: subDays(new Date(), 30),
        },
      },
    }),
    prisma.maintenanceLog.findMany({
      where: { workspaceId, voidedAt: null },
      orderBy: { date: "desc" },
      take: 6,
      include: {
        printer: true,
        materialSystem: true,
        buildPlate: true,
        hotend: true,
        safetyEquipment: true,
      },
    }),
    prisma.smartPlug.findMany({
      where: { workspaceId },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    prisma.safetyEquipment.findMany({
      where: { workspaceId },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    prisma.printer.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
      include: {
        installedHotend: true,
        installedPlate: true,
        smartPlug: true,
        materialSystems: true,
      },
    }),
    prisma.materialSystem.findMany({ where: { workspaceId } }),
    prisma.buildPlate.findMany({ where: { workspaceId } }),
    prisma.hotend.findMany({ where: { workspaceId } }),
    prisma.toolPart.findMany({ where: { workspaceId, archivedAt: null } }),
    prisma.filamentSpool.groupBy({
      where: { workspaceId },
      by: ["materialType"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
    }),
    prisma.wishlistItem.groupBy({
      where: { workspaceId, status: { not: WishlistStatus.PURCHASED } },
      by: ["priority"],
      _count: { _all: true },
    }),
    prisma.importJob.findMany({
      where: { workspaceId, status: "STAGED" },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const printerSetupGaps = printers.filter(
    (printer) =>
      !printer.installedHotendId ||
      !printer.installedPlateId ||
      printer.materialSystems.length === 0,
  );
  const maintenanceAttention = printers.filter((printer) => {
    const newestMaintenance = recentMaintenance.find((log) => log.printerId === printer.id);
    if (!newestMaintenance) {
      return true;
    }
    return newestMaintenance.date < subDays(new Date(), 45);
  });
  const topWishlistPriority =
    wishlistByPriority.sort(
      (a, b) =>
        wishlistPriorityOrder.indexOf(a.priority) - wishlistPriorityOrder.indexOf(b.priority),
    )[0] ?? null;

  return {
    lowStockConsumables: consumables
      .map((item) => ({
        ...item,
        status:
          item.status === StockStatus.ARCHIVED
            ? item.status
            : deriveConsumableStatus(Number(item.quantity), Number(item.reorderThreshold)),
      }))
      .filter(
        (item) =>
          item.status === StockStatus.LOW ||
          item.status === StockStatus.OUT,
      )
      .slice(0, 8),
    totals: {
      totalPrinters,
      activePrinters,
      totalFilamentSpools: totalFilamentSpools._sum.quantity ?? 0,
      lowStockItems:
        lowStockFilament.length +
        consumables.filter((item) => {
          const status =
            item.status === StockStatus.ARCHIVED
              ? item.status
              : deriveConsumableStatus(Number(item.quantity), Number(item.reorderThreshold));
          return status === StockStatus.LOW || status === StockStatus.OUT;
        }).length,
      wishlistCount,
      maintenanceCount,
    },
    lowStockFilament,
    recentMaintenance,
    smartPlugs,
    safetyEquipment,
    printers,
    stagedImportJobs,
    setupSummary: {
      printerSetupGaps: printerSetupGaps.length,
      maintenanceAttention: maintenanceAttention.length,
    },
    onboardingState: {
      hasInventory:
        totalPrinters > 0 ||
        (totalFilamentSpools._sum.quantity ?? 0) > 0 ||
        materialSystems.length > 0 ||
        consumables.length > 0,
    },
    nextPriority: topWishlistPriority
      ? {
          priority: topWishlistPriority.priority,
          count: topWishlistPriority._count._all,
        }
      : null,
    inventoryByCategory: [
      { label: "Printers", value: totalPrinters },
      { label: "Material Systems", value: materialSystems.length },
      { label: "Build Plates", value: buildPlates.length },
      { label: "Hotends", value: hotends.length },
      { label: "Filament SKUs", value: filamentByMaterial.reduce((sum, item) => sum + (item._sum.quantity ?? 0), 0) },
      { label: "Consumables", value: consumables.length },
      { label: "Safety", value: safetyEquipment.length },
      { label: "Tools / Parts", value: tools.length },
    ],
    filamentByMaterial,
    wishlistByPriority,
  };
}

export const printerDetailInclude = {
  smartPlug: true,
  installedHotend: true,
  installedPlate: true,
  materialSystems: true,
  compatiblePlates: { include: { buildPlate: true } },
  compatibleHotends: { include: { hotend: true } },
  compatibleMaterialSystems: { include: { materialSystem: true } },
  maintenanceLogs: {
    where: { voidedAt: null },
    orderBy: { date: "desc" as const },
    include: {
      consumablesUsed: { include: { consumableItem: true } },
      hotend: true,
      buildPlate: true,
      safetyEquipment: true,
    },
  },
} satisfies Prisma.PrinterInclude;

export async function getPrinterBySlug(slug: string) {
  const workspaceId = await getWorkspaceId();
  return prisma.printer.findFirst({
    where: { workspaceId, slug },
    include: printerDetailInclude,
  });
}

export async function getPrinters() {
  const workspaceId = await getWorkspaceId();
  return prisma.printer.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
    include: {
      smartPlug: true,
      installedHotend: true,
      installedPlate: true,
      materialSystems: true,
      maintenanceLogs: {
        where: { voidedAt: null },
        orderBy: { date: "desc" },
        take: 3,
      },
    },
  });
}

export async function getMaterialSystems() {
  const workspaceId = await getWorkspaceId();
  return prisma.materialSystem.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
    include: {
      assignedPrinter: true,
      compatiblePrinters: { include: { printer: true } },
      maintenanceLogs: { where: { voidedAt: null }, orderBy: { date: "desc" }, take: 3 },
    },
  });
}

export async function getBuildPlates() {
  const workspaceId = await getWorkspaceId();
  return prisma.buildPlate.findMany({
    where: { workspaceId },
    orderBy: [{ sizeMm: "asc" }, { name: "asc" }],
    include: {
      installedOnPrinter: true,
      compatiblePrinters: { include: { printer: true } },
      maintenanceLogs: { where: { voidedAt: null }, orderBy: { date: "desc" }, take: 3 },
    },
  });
}

export async function getHotends() {
  const workspaceId = await getWorkspaceId();
  return prisma.hotend.findMany({
    where: { workspaceId },
    orderBy: [{ name: "asc" }],
    include: {
      installedOnPrinter: true,
      compatiblePrinters: { include: { printer: true } },
      maintenanceLogs: { where: { voidedAt: null }, orderBy: { date: "desc" }, take: 3 },
    },
  });
}

export async function getFilament() {
  const workspaceId = await getWorkspaceId();
  return prisma.filamentSpool.findMany({
    where: { workspaceId },
    orderBy: [{ materialType: "asc" }, { brand: "asc" }, { color: "asc" }],
    include: {
      filamentRecommendation: true,
    },
  });
}

export async function getConsumables() {
  const workspaceId = await getWorkspaceId();
  const items = await prisma.consumableItem.findMany({
    where: { workspaceId },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return items.map((item) => ({
    ...item,
    status:
      item.status === StockStatus.ARCHIVED
        ? item.status
        : deriveConsumableStatus(Number(item.quantity), Number(item.reorderThreshold)),
  }));
}

export async function getSafetyEquipment() {
  const workspaceId = await getWorkspaceId();
  return prisma.safetyEquipment.findMany({
    where: { workspaceId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: {
      maintenanceLogs: { where: { voidedAt: null }, orderBy: { date: "desc" }, take: 3 },
    },
  });
}

export async function getSmartPlugs() {
  const workspaceId = await getWorkspaceId();
  return prisma.smartPlug.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
    include: {
      printer: true,
    },
  });
}

export async function getTools() {
  const workspaceId = await getWorkspaceId();
  return prisma.toolPart.findMany({
    where: { workspaceId, archivedAt: null },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function getWishlist() {
  const workspaceId = await getWorkspaceId();
  return prisma.wishlistItem.findMany({
    where: { workspaceId },
    orderBy: [{ priority: "desc" }, { status: "asc" }, { name: "asc" }],
  });
}

export async function getMaintenanceLogs() {
  const workspaceId = await getWorkspaceId();
  return prisma.maintenanceLog.findMany({
    where: { workspaceId, voidedAt: null },
    orderBy: { date: "desc" },
    include: {
      printer: true,
      materialSystem: true,
      buildPlate: true,
      hotend: true,
      safetyEquipment: true,
      consumablesUsed: { include: { consumableItem: true } },
    },
  });
}

export async function getAuditEvents() {
  const workspaceId = await getWorkspaceId();
  return prisma.auditEvent.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      actorUser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function getImportJobs(selectedId?: string | null) {
  const workspaceId = await getWorkspaceId();
  const jobs = await prisma.importJob.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: {
      createdByUser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    take: 12,
  });

  const selectedJobId = selectedId && jobs.some((job) => job.id === selectedId) ? selectedId : jobs[0]?.id;
  const selectedJob = selectedJobId
    ? await prisma.importJob.findFirst({
        where: { id: selectedJobId, workspaceId },
        include: {
          createdByUser: {
            select: {
              name: true,
              email: true,
            },
          },
          rows: {
            orderBy: { rowIndex: "asc" },
          },
        },
      })
    : null;

  const rowMatchIds = selectedJob
    ? Array.from(
        new Set(
          selectedJob.rows
            .map((row) => row.resolvedMatchId ?? row.suggestedMatchId)
            .filter((value): value is string => Boolean(value)),
        ),
      )
    : [];

  const matchedRecords = selectedJob
    ? await fetchImportComparisonRecords(selectedJob.entityType, workspaceId, rowMatchIds)
    : new Map<string, Record<string, unknown>>();

  const selectedJobActivity = selectedJob
    ? await prisma.auditEvent.findMany({
        where: {
          workspaceId,
          OR: [
            { entityId: selectedJob.id },
            { metadata: { path: ["importJobId"], equals: selectedJob.id } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 12,
        include: {
          actorUser: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })
    : [];

  return {
    jobs,
    selectedJob: selectedJob
      ? {
          ...selectedJob,
          rows: selectedJob.rows.map((row) => {
            const currentRecord =
              matchedRecords.get(row.resolvedMatchId ?? row.suggestedMatchId ?? "") ?? null;

            return {
              ...row,
              review: buildImportRowReview({
                entityType: selectedJob.entityType,
                status: row.status,
                resolution: row.resolution,
                suggestedMatchSlug: row.suggestedMatchSlug,
                validationErrors: row.validationErrors,
                data: row.data as Record<string, unknown>,
                currentRecord,
              }),
              comparisonRecord: currentRecord,
            };
          }),
        }
      : null,
    selectedJobActivity,
  };
}

async function fetchImportComparisonRecords(
  entityType: ImportEntityType,
  workspaceId: string,
  ids: string[],
) {
  if (ids.length === 0) {
    return new Map<string, Record<string, unknown>>();
  }

  switch (entityType) {
    case "PRINTER": {
      const records = await prisma.printer.findMany({
        where: { workspaceId, id: { in: ids } },
        select: {
          id: true,
          name: true,
          brand: true,
          model: true,
          buildVolumeX: true,
          buildVolumeY: true,
          buildVolumeZ: true,
          location: true,
          status: true,
          notes: true,
        },
      });
      return new Map(records.map((record) => [record.id, normalizeComparisonRecord(record)]));
    }
    case "MATERIAL_SYSTEM": {
      const records = await prisma.materialSystem.findMany({
        where: { workspaceId, id: { in: ids } },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          supportedMaterialsNotes: true,
          notes: true,
        },
      });
      return new Map(records.map((record) => [record.id, normalizeComparisonRecord(record)]));
    }
    case "BUILD_PLATE": {
      const records = await prisma.buildPlate.findMany({
        where: { workspaceId, id: { in: ids } },
        select: {
          id: true,
          name: true,
          sizeMm: true,
          surfaceType: true,
          status: true,
          notes: true,
        },
      });
      return new Map(records.map((record) => [record.id, normalizeComparisonRecord(record)]));
    }
    case "HOTEND": {
      const records = await prisma.hotend.findMany({
        where: { workspaceId, id: { in: ids } },
        select: {
          id: true,
          name: true,
          nozzleSize: true,
          materialType: true,
          quantity: true,
          status: true,
          notes: true,
        },
      });
      return new Map(records.map((record) => [record.id, normalizeComparisonRecord(record)]));
    }
    case "FILAMENT": {
      const records = await prisma.filamentSpool.findMany({
        where: { workspaceId, id: { in: ids } },
        select: {
          id: true,
          brand: true,
          materialType: true,
          color: true,
          quantity: true,
          estimatedRemainingGrams: true,
          abrasive: true,
          dryingRequired: true,
          hygroscopicLevel: true,
          storageLocation: true,
          notes: true,
        },
      });
      return new Map(records.map((record) => [record.id, normalizeComparisonRecord(record)]));
    }
    case "CONSUMABLE": {
      const records = await prisma.consumableItem.findMany({
        where: { workspaceId, id: { in: ids } },
        select: {
          id: true,
          name: true,
          category: true,
          quantity: true,
          unit: true,
          reorderThreshold: true,
          storageLocation: true,
          notes: true,
        },
      });
      return new Map(records.map((record) => [record.id, normalizeComparisonRecord(record)]));
    }
    case "SAFETY": {
      const records = await prisma.safetyEquipment.findMany({
        where: { workspaceId, id: { in: ids } },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          replacementSchedule: true,
          notes: true,
        },
      });
      return new Map(records.map((record) => [record.id, normalizeComparisonRecord(record)]));
    }
    case "SMART_PLUG": {
      const records = await prisma.smartPlug.findMany({
        where: { workspaceId, id: { in: ids } },
        select: {
          id: true,
          name: true,
          assignedDeviceLabel: true,
          status: true,
          powerMonitoringCapable: true,
          notes: true,
        },
      });
      return new Map(records.map((record) => [record.id, normalizeComparisonRecord(record)]));
    }
    case "TOOL_PART": {
      const records = await prisma.toolPart.findMany({
        where: { workspaceId, id: { in: ids } },
        select: {
          id: true,
          name: true,
          category: true,
          quantity: true,
          storageLocation: true,
          notes: true,
        },
      });
      return new Map(records.map((record) => [record.id, normalizeComparisonRecord(record)]));
    }
    case "WISHLIST": {
      const records = await prisma.wishlistItem.findMany({
        where: { workspaceId, id: { in: ids } },
        select: {
          id: true,
          name: true,
          category: true,
          priority: true,
          estimatedCost: true,
          vendor: true,
          purchaseUrl: true,
          status: true,
          notes: true,
        },
      });
      return new Map(records.map((record) => [record.id, normalizeComparisonRecord(record)]));
    }
    default:
      return new Map<string, Record<string, unknown>>();
  }
}

function normalizeComparisonRecord(record: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      value && typeof value === "object" && "toString" in value ? String(value) : value,
    ]),
  );
}

export const wishlistPriorityOrder: WishlistPriority[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
];
