import {
  Prisma,
  StockStatus,
  WishlistPriority,
  WishlistStatus,
} from "@prisma/client";
import { subDays } from "date-fns";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getWorkspaceId() {
  const session = await requireSession();
  return session.user.workspaceId;
}

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
  ]);

  return {
    lowStockConsumables: consumables
      .filter(
        (item) =>
          item.status === StockStatus.LOW ||
          Number(item.quantity) <= Number(item.reorderThreshold),
      )
      .slice(0, 8),
    totals: {
      totalPrinters,
      activePrinters,
      totalFilamentSpools: totalFilamentSpools._sum.quantity ?? 0,
      lowStockItems:
        lowStockFilament.length +
        consumables.filter(
          (item) =>
            item.status === StockStatus.LOW ||
            Number(item.quantity) <= Number(item.reorderThreshold),
        ).length,
      wishlistCount,
      maintenanceCount,
    },
    lowStockFilament,
    recentMaintenance,
    smartPlugs,
    safetyEquipment,
    printers,
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
  return prisma.consumableItem.findMany({
    where: { workspaceId },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
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

  return {
    jobs,
    selectedJob,
  };
}

export const wishlistPriorityOrder: WishlistPriority[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
];
