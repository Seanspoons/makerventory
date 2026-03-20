import {
  Prisma,
  StockStatus,
  WishlistPriority,
  WishlistStatus,
} from "@prisma/client";
import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";

export async function getDashboardData() {
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
    prisma.printer.count(),
    prisma.printer.count({ where: { status: "ACTIVE" } }),
    prisma.filamentSpool.aggregate({ _sum: { quantity: true } }),
    prisma.filamentSpool.findMany({
      where: {
        OR: [{ status: StockStatus.LOW }, { nearlyEmpty: true }],
      },
      orderBy: [{ nearlyEmpty: "desc" }, { estimatedRemainingGrams: "asc" }],
      take: 8,
    }),
    prisma.consumableItem.findMany({
      orderBy: [{ status: "desc" }, { quantity: "asc" }],
    }),
    prisma.wishlistItem.count({
      where: {
        status: {
          not: WishlistStatus.PURCHASED,
        },
      },
    }),
    prisma.maintenanceLog.count({
      where: {
        date: {
          gte: subDays(new Date(), 30),
        },
      },
    }),
    prisma.maintenanceLog.findMany({
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
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    prisma.safetyEquipment.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    prisma.printer.findMany({
      orderBy: { name: "asc" },
      include: {
        installedHotend: true,
        installedPlate: true,
        smartPlug: true,
        materialSystems: true,
      },
    }),
    prisma.materialSystem.findMany(),
    prisma.buildPlate.findMany(),
    prisma.hotend.findMany(),
    prisma.toolPart.findMany(),
    prisma.filamentSpool.groupBy({
      by: ["materialType"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
    }),
    prisma.wishlistItem.groupBy({
      by: ["priority"],
      _count: { _all: true },
      where: { status: { not: WishlistStatus.PURCHASED } },
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
  return prisma.printer.findUnique({
    where: { slug },
    include: printerDetailInclude,
  });
}

export async function getPrinters() {
  return prisma.printer.findMany({
    orderBy: { name: "asc" },
    include: {
      smartPlug: true,
      installedHotend: true,
      installedPlate: true,
      materialSystems: true,
      maintenanceLogs: {
        orderBy: { date: "desc" },
        take: 3,
      },
    },
  });
}

export async function getMaterialSystems() {
  return prisma.materialSystem.findMany({
    orderBy: { name: "asc" },
    include: {
      assignedPrinter: true,
      compatiblePrinters: { include: { printer: true } },
      maintenanceLogs: { orderBy: { date: "desc" }, take: 3 },
    },
  });
}

export async function getBuildPlates() {
  return prisma.buildPlate.findMany({
    orderBy: [{ sizeMm: "asc" }, { name: "asc" }],
    include: {
      installedOnPrinter: true,
      compatiblePrinters: { include: { printer: true } },
      maintenanceLogs: { orderBy: { date: "desc" }, take: 3 },
    },
  });
}

export async function getHotends() {
  return prisma.hotend.findMany({
    orderBy: [{ name: "asc" }],
    include: {
      installedOnPrinter: true,
      compatiblePrinters: { include: { printer: true } },
      maintenanceLogs: { orderBy: { date: "desc" }, take: 3 },
    },
  });
}

export async function getFilament() {
  return prisma.filamentSpool.findMany({
    orderBy: [{ materialType: "asc" }, { brand: "asc" }, { color: "asc" }],
    include: {
      filamentRecommendation: true,
    },
  });
}

export async function getConsumables() {
  return prisma.consumableItem.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function getSafetyEquipment() {
  return prisma.safetyEquipment.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: {
      maintenanceLogs: { orderBy: { date: "desc" }, take: 3 },
    },
  });
}

export async function getSmartPlugs() {
  return prisma.smartPlug.findMany({
    orderBy: { name: "asc" },
    include: {
      printer: true,
    },
  });
}

export async function getTools() {
  return prisma.toolPart.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function getWishlist() {
  return prisma.wishlistItem.findMany({
    orderBy: [{ priority: "desc" }, { status: "asc" }, { name: "asc" }],
  });
}

export async function getMaintenanceLogs() {
  return prisma.maintenanceLog.findMany({
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

export const wishlistPriorityOrder: WishlistPriority[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
];
