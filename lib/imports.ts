import {
  FilamentHygroscopicLevel,
  ImportEntityType,
  ImportJobStatus,
  ImportRowResolution,
  ImportRowStatus,
  Prisma,
  StockStatus,
  WishlistPriority,
  WishlistStatus,
} from "@prisma/client";
import { parse } from "csv-parse/sync";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const MAX_IMPORT_BYTES = 1024 * 1024;

const STOCK_STATUSES = new Set<StockStatus>(["HEALTHY", "LOW", "OUT", "ARCHIVED"]);
const HYGROSCOPIC_LEVELS = new Set<FilamentHygroscopicLevel>(["LOW", "MEDIUM", "HIGH"]);
const WISHLIST_PRIORITIES = new Set<WishlistPriority>(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const WISHLIST_STATUSES = new Set<WishlistStatus>([
  "PLANNED",
  "RESEARCHING",
  "READY_TO_BUY",
  "PURCHASED",
]);

export const importEntityOptions = [
  {
    value: "FILAMENT" as const,
    label: "Filament",
    description:
      "Columns: brand, materialType, color, quantity, estimatedRemainingGrams, abrasive, dryingRequired, hygroscopicLevel.",
  },
  {
    value: "CONSUMABLE" as const,
    label: "Consumables",
    description:
      "Columns: name, category, quantity, unit, reorderThreshold, status, storageLocation.",
  },
  {
    value: "TOOL_PART" as const,
    label: "Tools / Parts",
    description:
      "Columns: name, category, quantity, storageLocation, notes.",
  },
  {
    value: "WISHLIST" as const,
    label: "Wishlist",
    description:
      "Columns: name, category, priority, estimatedCost, vendor, purchaseUrl, status.",
  },
] satisfies Array<{
  value: ImportEntityType;
  label: string;
  description: string;
}>;

export type ImportEntityOption = (typeof importEntityOptions)[number];

type StagedRow = {
  rowIndex: number;
  status: ImportRowStatus;
  resolution: ImportRowResolution;
  fingerprint: string;
  suggestedMatchId?: string;
  suggestedMatchSlug?: string;
  resolvedMatchId?: string;
  resolvedMatchSlug?: string;
  data: Prisma.InputJsonValue;
  validationErrors: string[];
};

export const importFieldConfigs = {
  FILAMENT: [
    { key: "brand", label: "Brand", required: true },
    { key: "materialType", label: "Material type", required: true },
    { key: "color", label: "Color", required: true },
    { key: "quantity", label: "Quantity" },
    { key: "estimatedRemainingGrams", label: "Remaining grams" },
    { key: "abrasive", label: "Abrasive" },
    { key: "dryingRequired", label: "Drying required" },
    { key: "hygroscopicLevel", label: "Hygroscopic level" },
  ],
  CONSUMABLE: [
    { key: "name", label: "Name", required: true },
    { key: "category", label: "Category", required: true },
    { key: "quantity", label: "Quantity" },
    { key: "unit", label: "Unit", required: true },
    { key: "reorderThreshold", label: "Reorder threshold" },
    { key: "status", label: "Status" },
    { key: "storageLocation", label: "Storage location" },
  ],
  TOOL_PART: [
    { key: "name", label: "Name", required: true },
    { key: "category", label: "Category", required: true },
    { key: "quantity", label: "Quantity" },
    { key: "storageLocation", label: "Storage location" },
    { key: "notes", label: "Notes" },
  ],
  WISHLIST: [
    { key: "name", label: "Name", required: true },
    { key: "category", label: "Category", required: true },
    { key: "priority", label: "Priority" },
    { key: "estimatedCost", label: "Estimated cost" },
    { key: "vendor", label: "Vendor" },
    { key: "purchaseUrl", label: "Purchase URL" },
    { key: "status", label: "Status" },
  ],
} satisfies Record<ImportEntityType, Array<{ key: string; label: string; required?: boolean }>>;

export type ImportFieldConfig = (typeof importFieldConfigs)[ImportEntityType][number];
export type ImportFieldMapping = Record<string, string>;

function parseBoolean(value: unknown) {
  if (typeof value !== "string") return false;
  return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
}

function parseInteger(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function parseDecimal(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOptionalString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeColumnKey(value: string) {
  return value.trim().toLowerCase();
}

function mapRecordFields(
  record: Record<string, string>,
  fieldMapping: ImportFieldMapping,
) {
  const normalizedRecord = new Map<string, string>();
  for (const [key, value] of Object.entries(record)) {
    normalizedRecord.set(normalizeColumnKey(key), value);
  }

  const mapped: Record<string, string> = {};
  for (const [targetField, sourceColumn] of Object.entries(fieldMapping)) {
    const normalizedSource = normalizeColumnKey(sourceColumn);
    if (!normalizedSource) {
      continue;
    }
    const value = normalizedRecord.get(normalizedSource);
    if (typeof value === "string") {
      mapped[targetField] = value;
    }
  }

  return mapped;
}

function parseStockStatus(value: unknown, validationErrors: string[]) {
  const normalized = parseOptionalString(value)?.toUpperCase();
  if (!normalized) {
    return StockStatus.HEALTHY;
  }

  if (!STOCK_STATUSES.has(normalized as StockStatus)) {
    validationErrors.push(`invalid stock status: ${value}`);
    return StockStatus.HEALTHY;
  }

  return normalized as StockStatus;
}

function parseHygroscopicLevel(value: unknown, validationErrors: string[]) {
  const normalized = parseOptionalString(value)?.toUpperCase();
  if (!normalized) {
    return null;
  }

  if (!HYGROSCOPIC_LEVELS.has(normalized as FilamentHygroscopicLevel)) {
    validationErrors.push(`invalid hygroscopic level: ${value}`);
    return null;
  }

  return normalized as FilamentHygroscopicLevel;
}

function parseWishlistPriority(value: unknown, validationErrors: string[]) {
  const normalized = parseOptionalString(value)?.toUpperCase();
  if (!normalized) {
    return WishlistPriority.MEDIUM;
  }

  if (!WISHLIST_PRIORITIES.has(normalized as WishlistPriority)) {
    validationErrors.push(`invalid priority: ${value}`);
    return WishlistPriority.MEDIUM;
  }

  return normalized as WishlistPriority;
}

function parseWishlistStatus(value: unknown, validationErrors: string[]) {
  const normalized = parseOptionalString(value)?.toUpperCase();
  if (!normalized) {
    return WishlistStatus.PLANNED;
  }

  if (!WISHLIST_STATUSES.has(normalized as WishlistStatus)) {
    validationErrors.push(`invalid wishlist status: ${value}`);
    return WishlistStatus.PLANNED;
  }

  return normalized as WishlistStatus;
}

function finalizeRows(rows: StagedRow[]) {
  const fingerprints = new Map<string, number[]>();

  for (const row of rows) {
    if (!row.fingerprint) {
      continue;
    }

    const indices = fingerprints.get(row.fingerprint) ?? [];
    indices.push(row.rowIndex);
    fingerprints.set(row.fingerprint, indices);
  }

  return rows.map((row) => {
    const duplicateIndices = fingerprints.get(row.fingerprint) ?? [];
    if (duplicateIndices.length <= 1 || row.status === ImportRowStatus.ERROR) {
      return row;
    }

    return {
      ...row,
      status: ImportRowStatus.CONFLICT,
      resolution: ImportRowResolution.SKIP,
      validationErrors: [
        ...row.validationErrors,
        `duplicate fingerprint in upload batch at row(s): ${duplicateIndices.join(", ")}`,
      ],
    };
  });
}

export async function readCsvFile(file: File) {
  if (!file || file.size === 0) {
    throw new Error("A CSV file is required.");
  }

  if (file.size > MAX_IMPORT_BYTES) {
    throw new Error("Import file exceeds the 1 MB limit.");
  }

  const filename = file.name.toLowerCase();
  if (!filename.endsWith(".csv")) {
    throw new Error("Only CSV files are supported.");
  }

  const text = await file.text();
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  if (records.length === 0) {
    throw new Error("The CSV file did not contain any importable rows.");
  }

  return records;
}

function summarize(rows: StagedRow[]) {
  return {
    totalRows: rows.length,
    newRows: rows.filter((row) => row.status === ImportRowStatus.NEW).length,
    matchedRows: rows.filter((row) => row.status === ImportRowStatus.MATCHED).length,
    conflictRows: rows.filter((row) => row.status === ImportRowStatus.CONFLICT).length,
    skippedRows: rows.filter(
      (row) => row.status === ImportRowStatus.SKIPPED || row.status === ImportRowStatus.ERROR,
    ).length,
  };
}

async function stageFilamentRows(
  workspaceId: string,
  records: Record<string, string>[],
): Promise<StagedRow[]> {
  const existing = await prisma.filamentSpool.findMany({
    where: { workspaceId },
    select: { id: true, brand: true, materialType: true, color: true },
  });

  const rows = records.map((record, index) => {
    const brand = record.brand?.trim();
    const materialType = record.materialType?.trim();
    const color = record.color?.trim();
    const validationErrors: string[] = [];

    if (!brand) validationErrors.push("brand is required");
    if (!materialType) validationErrors.push("materialType is required");
    if (!color) validationErrors.push("color is required");

    const fingerprint = slugify(`${brand}-${materialType}-${color}`);
    const match = existing.find(
      (item) =>
        slugify(`${item.brand}-${item.materialType}-${item.color}`) === fingerprint,
    );

    const status =
      validationErrors.length > 0
        ? ImportRowStatus.ERROR
        : match
          ? ImportRowStatus.MATCHED
          : ImportRowStatus.NEW;
    const resolution =
      validationErrors.length > 0
        ? ImportRowResolution.SKIP
        : match
          ? ImportRowResolution.UPDATE_MATCH
          : ImportRowResolution.CREATE_NEW;

    return {
      rowIndex: index + 1,
      status,
      resolution,
      fingerprint,
      suggestedMatchId: match?.id,
      suggestedMatchSlug: match ? fingerprint : undefined,
      resolvedMatchId: match?.id,
      resolvedMatchSlug: match ? fingerprint : undefined,
      validationErrors,
      data: {
        brand,
        materialType,
        subtype: parseOptionalString(record.subtype),
        finish: parseOptionalString(record.finish),
        color,
        quantity: parseInteger(record.quantity, 1),
        estimatedRemainingGrams: parseInteger(record.estimatedRemainingGrams, 1000),
        storageLocation: parseOptionalString(record.storageLocation),
        status: parseStockStatus(record.status, validationErrors),
        opened: parseBoolean(record.opened),
        nearlyEmpty: parseBoolean(record.nearlyEmpty),
        abrasive: parseBoolean(record.abrasive),
        dryingRequired: parseBoolean(record.dryingRequired),
        hygroscopicLevel: parseHygroscopicLevel(record.hygroscopicLevel, validationErrors),
        notes: parseOptionalString(record.notes),
        recommendedNozzle: parseOptionalString(record.recommendedNozzle),
        dryerSuggested: parseBoolean(record.dryerSuggested),
        hardenedNozzleNeeded: parseBoolean(record.hardenedNozzleNeeded),
        recommendationNotes: parseOptionalString(record.recommendationNotes),
      },
    };
  });

  return finalizeRows(rows);
}

async function stageConsumableRows(
  workspaceId: string,
  records: Record<string, string>[],
): Promise<StagedRow[]> {
  const existing = await prisma.consumableItem.findMany({
    where: { workspaceId },
    select: { id: true, slug: true },
  });

  const rows = records.map((record, index) => {
    const name = record.name?.trim();
    const category = record.category?.trim();
    const unit = record.unit?.trim();
    const validationErrors: string[] = [];
    if (!name) validationErrors.push("name is required");
    if (!category) validationErrors.push("category is required");
    if (!unit) validationErrors.push("unit is required");

    const fingerprint = slugify(name ?? `row-${index + 1}`);
    const match = existing.find((item) => item.slug === fingerprint);
    const status =
      validationErrors.length > 0
        ? ImportRowStatus.ERROR
        : match
          ? ImportRowStatus.MATCHED
          : ImportRowStatus.NEW;
    const resolution =
      validationErrors.length > 0
        ? ImportRowResolution.SKIP
        : match
          ? ImportRowResolution.UPDATE_MATCH
          : ImportRowResolution.CREATE_NEW;

    return {
      rowIndex: index + 1,
      status,
      resolution,
      fingerprint,
      suggestedMatchId: match?.id,
      suggestedMatchSlug: match?.slug,
      resolvedMatchId: match?.id,
      resolvedMatchSlug: match?.slug,
      validationErrors,
      data: {
        name,
        category,
        quantity: parseDecimal(record.quantity, 1),
        unit,
        reorderThreshold: parseDecimal(record.reorderThreshold, 1),
        status: parseStockStatus(record.status, validationErrors),
        storageLocation: parseOptionalString(record.storageLocation),
        notes: parseOptionalString(record.notes),
      },
    };
  });

  return finalizeRows(rows);
}

async function stageToolRows(
  workspaceId: string,
  records: Record<string, string>[],
): Promise<StagedRow[]> {
  const existing = await prisma.toolPart.findMany({
    where: { workspaceId },
    select: { id: true, slug: true },
  });

  const rows = records.map((record, index) => {
    const name = record.name?.trim();
    const category = record.category?.trim();
    const validationErrors: string[] = [];
    if (!name) validationErrors.push("name is required");
    if (!category) validationErrors.push("category is required");

    const fingerprint = slugify(name ?? `row-${index + 1}`);
    const match = existing.find((item) => item.slug === fingerprint);
    const status =
      validationErrors.length > 0
        ? ImportRowStatus.ERROR
        : match
          ? ImportRowStatus.MATCHED
          : ImportRowStatus.NEW;
    const resolution =
      validationErrors.length > 0
        ? ImportRowResolution.SKIP
        : match
          ? ImportRowResolution.UPDATE_MATCH
          : ImportRowResolution.CREATE_NEW;

    return {
      rowIndex: index + 1,
      status,
      resolution,
      fingerprint,
      suggestedMatchId: match?.id,
      suggestedMatchSlug: match?.slug,
      resolvedMatchId: match?.id,
      resolvedMatchSlug: match?.slug,
      validationErrors,
      data: {
        name,
        category,
        quantity: parseInteger(record.quantity, 1),
        storageLocation: parseOptionalString(record.storageLocation),
        notes: parseOptionalString(record.notes),
      },
    };
  });

  return finalizeRows(rows);
}

async function stageWishlistRows(
  workspaceId: string,
  records: Record<string, string>[],
): Promise<StagedRow[]> {
  const existing = await prisma.wishlistItem.findMany({
    where: { workspaceId },
    select: { id: true, slug: true },
  });

  const rows = records.map((record, index) => {
    const name = record.name?.trim();
    const category = record.category?.trim();
    const validationErrors: string[] = [];
    if (!name) validationErrors.push("name is required");
    if (!category) validationErrors.push("category is required");

    const fingerprint = slugify(name ?? `row-${index + 1}`);
    const match = existing.find((item) => item.slug === fingerprint);
    const status =
      validationErrors.length > 0
        ? ImportRowStatus.ERROR
        : match
          ? ImportRowStatus.MATCHED
          : ImportRowStatus.NEW;
    const resolution =
      validationErrors.length > 0
        ? ImportRowResolution.SKIP
        : match
          ? ImportRowResolution.UPDATE_MATCH
          : ImportRowResolution.CREATE_NEW;

    return {
      rowIndex: index + 1,
      status,
      resolution,
      fingerprint,
      suggestedMatchId: match?.id,
      suggestedMatchSlug: match?.slug,
      resolvedMatchId: match?.id,
      resolvedMatchSlug: match?.slug,
      validationErrors,
      data: {
        name,
        category,
        priority: parseWishlistPriority(record.priority, validationErrors),
        status: parseWishlistStatus(record.status, validationErrors),
        estimatedCost: parseDecimal(record.estimatedCost, 0),
        vendor: parseOptionalString(record.vendor),
        purchaseUrl: parseOptionalString(record.purchaseUrl),
        notes: parseOptionalString(record.notes),
      },
    };
  });

  return finalizeRows(rows);
}

export async function stageImportRecords(
  workspaceId: string,
  entityType: ImportEntityType,
  records: Record<string, string>[],
  fieldMapping?: ImportFieldMapping,
) {
  const mappedRecords =
    fieldMapping && Object.keys(fieldMapping).length > 0
      ? records.map((record) => mapRecordFields(record, fieldMapping))
      : records;

  switch (entityType) {
    case ImportEntityType.FILAMENT:
      return stageFilamentRows(workspaceId, mappedRecords);
    case ImportEntityType.CONSUMABLE:
      return stageConsumableRows(workspaceId, mappedRecords);
    case ImportEntityType.TOOL_PART:
      return stageToolRows(workspaceId, mappedRecords);
    case ImportEntityType.WISHLIST:
      return stageWishlistRows(workspaceId, mappedRecords);
    default:
      return [];
  }
}

export async function createImportJobWithRows(args: {
  workspaceId: string;
  userId: string;
  entityType: ImportEntityType;
  sourceName: string;
  originalFilename: string;
  notes?: string | null;
  fieldMapping?: ImportFieldMapping | null;
  rows: StagedRow[];
}) {
  const summary = summarize(args.rows);

  return prisma.importJob.create({
    data: {
      workspaceId: args.workspaceId,
      createdByUserId: args.userId,
      entityType: args.entityType,
      status: ImportJobStatus.STAGED,
      sourceName: args.sourceName,
      originalFilename: args.originalFilename,
      notes: args.notes ?? null,
      fieldMapping:
        args.fieldMapping && Object.keys(args.fieldMapping).length > 0
          ? args.fieldMapping
          : undefined,
      ...summary,
      rows: {
        create: args.rows.map((row) => ({
          workspaceId: args.workspaceId,
          rowIndex: row.rowIndex,
          entityType: args.entityType,
          status: row.status,
          resolution: row.resolution,
          fingerprint: row.fingerprint,
          suggestedMatchId: row.suggestedMatchId,
          suggestedMatchSlug: row.suggestedMatchSlug,
          resolvedMatchId: row.resolvedMatchId,
          resolvedMatchSlug: row.resolvedMatchSlug,
          data: row.data,
          validationErrors: row.validationErrors,
        })),
      },
    },
  });
}

export async function applyImportJobRows(jobId: string, workspaceId: string) {
  const appliedAt = new Date();

  return prisma.$transaction(async (tx) => {
    const job = await tx.importJob.findFirst({
      where: { id: jobId, workspaceId },
      include: { rows: { orderBy: { rowIndex: "asc" } } },
    });

    if (!job) {
      throw new Error("Import job not found.");
    }

    if (job.status === ImportJobStatus.APPLIED) {
      throw new Error("Import job has already been applied.");
    }

    for (const row of job.rows) {
      if (
        row.status === ImportRowStatus.ERROR ||
        row.status === ImportRowStatus.SKIPPED ||
        row.status === ImportRowStatus.CONFLICT
      ) {
        continue;
      }

      if (row.resolution === ImportRowResolution.SKIP) {
        continue;
      }

      const payload = row.data as Record<string, unknown>;

      if (job.entityType === ImportEntityType.FILAMENT) {
        const common = {
          brand: String(payload.brand ?? ""),
          materialType: String(payload.materialType ?? ""),
          subtype: (payload.subtype as string | null) ?? null,
          finish: (payload.finish as string | null) ?? null,
          color: String(payload.color ?? ""),
          quantity: Number(payload.quantity ?? 1),
          estimatedRemainingGrams: Number(payload.estimatedRemainingGrams ?? 1000),
          storageLocation: (payload.storageLocation as string | null) ?? null,
          status: String(payload.status ?? StockStatus.HEALTHY) as StockStatus,
          opened: Boolean(payload.opened),
          nearlyEmpty: Boolean(payload.nearlyEmpty),
          abrasive: Boolean(payload.abrasive),
          dryingRequired: Boolean(payload.dryingRequired),
          hygroscopicLevel:
            (payload.hygroscopicLevel as FilamentHygroscopicLevel | null) ?? null,
          notes: (payload.notes as string | null) ?? null,
          compatibilityTags: Boolean(payload.abrasive)
            ? ["Abrasive", "Hardened Nozzle"]
            : Boolean(payload.dryingRequired)
              ? ["Dryer Recommended"]
              : ["General Purpose"],
        };

        if (row.resolution === ImportRowResolution.UPDATE_MATCH && row.resolvedMatchId) {
          await tx.filamentSpool.update({
            where: { id: row.resolvedMatchId },
            data: {
              ...common,
              filamentRecommendation: {
                upsert: {
                  create: {
                    recommendedNozzle:
                      (payload.recommendedNozzle as string | null) ?? null,
                    dryerSuggested: Boolean(payload.dryerSuggested),
                    hardenedNozzleNeeded: Boolean(payload.hardenedNozzleNeeded),
                    notes: (payload.recommendationNotes as string | null) ?? null,
                  },
                  update: {
                    recommendedNozzle:
                      (payload.recommendedNozzle as string | null) ?? null,
                    dryerSuggested: Boolean(payload.dryerSuggested),
                    hardenedNozzleNeeded: Boolean(payload.hardenedNozzleNeeded),
                    notes: (payload.recommendationNotes as string | null) ?? null,
                  },
                },
              },
            },
          });
        } else {
          await tx.filamentSpool.create({
            data: {
              workspaceId,
              ...common,
              filamentRecommendation: {
                create: {
                  recommendedNozzle:
                    (payload.recommendedNozzle as string | null) ?? null,
                  dryerSuggested: Boolean(payload.dryerSuggested),
                  hardenedNozzleNeeded: Boolean(payload.hardenedNozzleNeeded),
                  notes: (payload.recommendationNotes as string | null) ?? null,
                },
              },
            },
          });
        }
      }

      if (job.entityType === ImportEntityType.CONSUMABLE) {
        const common = {
          name: String(payload.name ?? ""),
          slug: slugify(String(payload.name ?? "")),
          category: String(payload.category ?? ""),
          quantity: Number(payload.quantity ?? 1),
          unit: String(payload.unit ?? ""),
          reorderThreshold: Number(payload.reorderThreshold ?? 1),
          status: String(payload.status ?? StockStatus.HEALTHY) as StockStatus,
          storageLocation: (payload.storageLocation as string | null) ?? null,
          notes: (payload.notes as string | null) ?? null,
        };
        if (row.resolution === ImportRowResolution.UPDATE_MATCH && row.resolvedMatchId) {
          await tx.consumableItem.update({
            where: { id: row.resolvedMatchId },
            data: common,
          });
        } else {
          await tx.consumableItem.create({
            data: { workspaceId, ...common },
          });
        }
      }

      if (job.entityType === ImportEntityType.TOOL_PART) {
        const common = {
          name: String(payload.name ?? ""),
          slug: slugify(String(payload.name ?? "")),
          category: String(payload.category ?? ""),
          quantity: Number(payload.quantity ?? 1),
          storageLocation: (payload.storageLocation as string | null) ?? null,
          notes: (payload.notes as string | null) ?? null,
        };
        if (row.resolution === ImportRowResolution.UPDATE_MATCH && row.resolvedMatchId) {
          await tx.toolPart.update({
            where: { id: row.resolvedMatchId },
            data: common,
          });
        } else {
          await tx.toolPart.create({
            data: { workspaceId, ...common },
          });
        }
      }

      if (job.entityType === ImportEntityType.WISHLIST) {
        const common = {
          name: String(payload.name ?? ""),
          slug: slugify(String(payload.name ?? "")),
          category: String(payload.category ?? ""),
          priority: String(payload.priority ?? WishlistPriority.MEDIUM) as WishlistPriority,
          status: String(payload.status ?? WishlistStatus.PLANNED) as WishlistStatus,
          estimatedCost: Number(payload.estimatedCost ?? 0),
          vendor: (payload.vendor as string | null) ?? null,
          purchaseUrl: (payload.purchaseUrl as string | null) ?? null,
          notes: (payload.notes as string | null) ?? null,
        };
        if (row.resolution === ImportRowResolution.UPDATE_MATCH && row.resolvedMatchId) {
          await tx.wishlistItem.update({
            where: { id: row.resolvedMatchId },
            data: common,
          });
        } else {
          await tx.wishlistItem.create({
            data: { workspaceId, ...common },
          });
        }
      }

      await tx.importRow.update({
        where: { id: row.id },
        data: {
          status: ImportRowStatus.APPLIED,
          appliedAt,
        },
      });
    }

    return tx.importJob.update({
      where: { id: job.id },
      data: {
        status: ImportJobStatus.APPLIED,
        appliedAt,
      },
    });
  });
}
