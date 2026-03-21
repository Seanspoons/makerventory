import {
  FilamentHygroscopicLevel,
  ImportEntityType as PrismaImportEntityType,
  ImportJobStatus,
  ImportRowStatus,
  MaterialSystemStatus,
  MaterialSystemType,
  BuildPlateStatus,
  HotendStatus,
  PrinterStatus,
  Prisma,
  SafetyStatus,
  SmartPlugStatus,
  StockStatus,
  WishlistPriority,
  WishlistStatus,
} from "@prisma/client";
import type { ImportEntityType } from "@prisma/client";
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
const PRINTER_STATUSES = new Set<PrinterStatus>(["ACTIVE", "MAINTENANCE", "OFFLINE", "ARCHIVED"]);
const MATERIAL_SYSTEM_TYPES = new Set<MaterialSystemType>(["AMS_LITE", "AMS_2_PRO", "AMS_HT", "DRYER"]);
const MATERIAL_SYSTEM_STATUSES = new Set<MaterialSystemStatus>(["ACTIVE", "STANDBY", "MAINTENANCE", "OFFLINE", "ARCHIVED"]);
const BUILD_PLATE_STATUSES = new Set<BuildPlateStatus>(["AVAILABLE", "IN_USE", "WORN", "RETIRED"]);
const HOTEND_STATUSES = new Set<HotendStatus>(["AVAILABLE", "IN_USE", "LOW_STOCK", "RETIRED"]);
const SAFETY_STATUSES = new Set<SafetyStatus>(["ACTIVE", "NEEDS_ATTENTION", "PLANNED", "ARCHIVED"]);
const SMART_PLUG_STATUSES = new Set<SmartPlugStatus>(["ONLINE", "OFFLINE", "DISABLED"]);
const KNOWN_BRANDS = ["Bambu Lab", "ELEGOO", "AnyCubic", "Overture", "Sunlu", "Polymaker", "Siraya Tech", "Creality"];
const IMPORT_ROW_RESOLUTIONS = {
  CREATE_NEW: "CREATE_NEW",
  UPDATE_MATCH: "UPDATE_MATCH",
  SKIP: "SKIP",
} as const;
const IMPORT_ENTITY_TYPES = {
  PRINTER: "PRINTER",
  MATERIAL_SYSTEM: "MATERIAL_SYSTEM",
  BUILD_PLATE: "BUILD_PLATE",
  HOTEND: "HOTEND",
  FILAMENT: "FILAMENT",
  CONSUMABLE: "CONSUMABLE",
  SAFETY: "SAFETY",
  SMART_PLUG: "SMART_PLUG",
  TOOL_PART: "TOOL_PART",
  WISHLIST: "WISHLIST",
} as const satisfies Record<ImportEntityType, ImportEntityType>;
type ImportRowResolutionValue =
  (typeof IMPORT_ROW_RESOLUTIONS)[keyof typeof IMPORT_ROW_RESOLUTIONS];

function toPrismaImportEntityType(value: ImportEntityType) {
  return PrismaImportEntityType[value];
}

export const importEntityOptions = [
  {
    value: "PRINTER" as const,
    label: "Printers",
    description:
      "Columns: name, brand, model, buildVolumeX, buildVolumeY, buildVolumeZ, location, status, notes.",
  },
  {
    value: "MATERIAL_SYSTEM" as const,
    label: "Material Systems / Dryers",
    description:
      "Columns: name, type, status, supportedMaterialsNotes, notes.",
  },
  {
    value: "BUILD_PLATE" as const,
    label: "Build Plates",
    description:
      "Columns: name, sizeLabel, sizeMm, surfaceType, status, notes.",
  },
  {
    value: "HOTEND" as const,
    label: "Hotends",
    description:
      "Columns: name, nozzleSize, materialType, quantity, inUseCount, spareCount, status, notes.",
  },
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
    value: "SAFETY" as const,
    label: "Safety",
    description:
      "Columns: name, type, status, replacementSchedule, notes.",
  },
  {
    value: "SMART_PLUG" as const,
    label: "Smart Plugs",
    description:
      "Columns: name, assignedDeviceLabel, status, powerMonitoringCapable, notes.",
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
  resolution: ImportRowResolutionValue;
  fingerprint: string;
  suggestedMatchId?: string;
  suggestedMatchSlug?: string;
  resolvedMatchId?: string;
  resolvedMatchSlug?: string;
  data: Prisma.InputJsonValue;
  validationErrors: string[];
};

export const importFieldConfigs = {
  PRINTER: [
    { key: "name", label: "Name", required: true },
    { key: "brand", label: "Brand", required: true },
    { key: "model", label: "Model", required: true },
    { key: "buildVolumeX", label: "Build volume X" },
    { key: "buildVolumeY", label: "Build volume Y" },
    { key: "buildVolumeZ", label: "Build volume Z" },
    { key: "location", label: "Location" },
    { key: "status", label: "Status" },
  ],
  MATERIAL_SYSTEM: [
    { key: "name", label: "Name", required: true },
    { key: "type", label: "Type", required: true },
    { key: "status", label: "Status" },
    { key: "supportedMaterialsNotes", label: "Supported materials notes" },
    { key: "notes", label: "Notes" },
  ],
  BUILD_PLATE: [
    { key: "name", label: "Name", required: true },
    { key: "sizeLabel", label: "Size label", required: true },
    { key: "sizeMm", label: "Size mm", required: true },
    { key: "surfaceType", label: "Surface type", required: true },
    { key: "status", label: "Status" },
    { key: "notes", label: "Notes" },
  ],
  HOTEND: [
    { key: "name", label: "Name", required: true },
    { key: "nozzleSize", label: "Nozzle size", required: true },
    { key: "materialType", label: "Material type", required: true },
    { key: "quantity", label: "Quantity" },
    { key: "inUseCount", label: "In use count" },
    { key: "spareCount", label: "Spare count" },
    { key: "status", label: "Status" },
  ],
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
  SAFETY: [
    { key: "name", label: "Name", required: true },
    { key: "type", label: "Type", required: true },
    { key: "status", label: "Status" },
    { key: "replacementSchedule", label: "Replacement schedule" },
    { key: "notes", label: "Notes" },
  ],
  SMART_PLUG: [
    { key: "name", label: "Name", required: true },
    { key: "assignedDeviceLabel", label: "Assigned device label" },
    { key: "status", label: "Status" },
    { key: "powerMonitoringCapable", label: "Power monitoring capable" },
    { key: "notes", label: "Notes" },
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
export type NotesImportGroup = {
  groupKey: string;
  entityType: ImportEntityType;
  sectionLabel: string;
  sourceName: string;
  records: Record<string, string>[];
};

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

function parsePrinterStatus(value: unknown, validationErrors: string[]) {
  const normalized = parseOptionalString(value)?.toUpperCase();
  if (!normalized) return PrinterStatus.ACTIVE;
  if (!PRINTER_STATUSES.has(normalized as PrinterStatus)) {
    validationErrors.push(`invalid printer status: ${value}`);
    return PrinterStatus.ACTIVE;
  }
  return normalized as PrinterStatus;
}

function parseMaterialSystemType(value: unknown, validationErrors: string[]) {
  const normalized = parseOptionalString(value)?.toUpperCase().replace(/[\s-]+/g, "_");
  if (!normalized) {
    validationErrors.push("type is required");
    return MaterialSystemType.DRYER;
  }
  if (!MATERIAL_SYSTEM_TYPES.has(normalized as MaterialSystemType)) {
    validationErrors.push(`invalid material system type: ${value}`);
    return MaterialSystemType.DRYER;
  }
  return normalized as MaterialSystemType;
}

function parseMaterialSystemStatus(value: unknown, validationErrors: string[]) {
  const normalized = parseOptionalString(value)?.toUpperCase().replace(/[\s-]+/g, "_");
  if (!normalized) return MaterialSystemStatus.ACTIVE;
  if (!MATERIAL_SYSTEM_STATUSES.has(normalized as MaterialSystemStatus)) {
    validationErrors.push(`invalid material system status: ${value}`);
    return MaterialSystemStatus.ACTIVE;
  }
  return normalized as MaterialSystemStatus;
}

function parseBuildPlateStatus(value: unknown, validationErrors: string[]) {
  const normalized = parseOptionalString(value)?.toUpperCase().replace(/[\s-]+/g, "_");
  if (!normalized) return BuildPlateStatus.AVAILABLE;
  if (!BUILD_PLATE_STATUSES.has(normalized as BuildPlateStatus)) {
    validationErrors.push(`invalid build plate status: ${value}`);
    return BuildPlateStatus.AVAILABLE;
  }
  return normalized as BuildPlateStatus;
}

function parseHotendStatus(value: unknown, validationErrors: string[]) {
  const normalized = parseOptionalString(value)?.toUpperCase().replace(/[\s-]+/g, "_");
  if (!normalized) return HotendStatus.AVAILABLE;
  if (!HOTEND_STATUSES.has(normalized as HotendStatus)) {
    validationErrors.push(`invalid hotend status: ${value}`);
    return HotendStatus.AVAILABLE;
  }
  return normalized as HotendStatus;
}

function parseSafetyStatus(value: unknown, validationErrors: string[]) {
  const normalized = parseOptionalString(value)?.toUpperCase().replace(/[\s-]+/g, "_");
  if (!normalized) return SafetyStatus.ACTIVE;
  if (!SAFETY_STATUSES.has(normalized as SafetyStatus)) {
    validationErrors.push(`invalid safety status: ${value}`);
    return SafetyStatus.ACTIVE;
  }
  return normalized as SafetyStatus;
}

function parseSmartPlugStatus(value: unknown, validationErrors: string[]) {
  const normalized = parseOptionalString(value)?.toUpperCase().replace(/[\s-]+/g, "_");
  if (!normalized) return SmartPlugStatus.ONLINE;
  if (!SMART_PLUG_STATUSES.has(normalized as SmartPlugStatus)) {
    validationErrors.push(`invalid smart plug status: ${value}`);
    return SmartPlugStatus.ONLINE;
  }
  return normalized as SmartPlugStatus;
}

function defaultPrinterBuildVolume(model: string) {
  const normalized = model.toLowerCase();
  if (normalized.includes("a1 mini")) return { x: 180, y: 180, z: 180 };
  if (normalized.includes("p2s")) return { x: 256, y: 256, z: 256 };
  return { x: 256, y: 256, z: 256 };
}

function buildRowResolution(status: ImportRowStatus, hasMatch: boolean) {
  if (status === ImportRowStatus.ERROR || status === ImportRowStatus.CONFLICT) {
    return IMPORT_ROW_RESOLUTIONS.SKIP;
  }
  return hasMatch
    ? IMPORT_ROW_RESOLUTIONS.UPDATE_MATCH
    : IMPORT_ROW_RESOLUTIONS.CREATE_NEW;
}

function sectionCategoryName(section: string) {
  return section
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBracketNote(value: string) {
  const match = value.match(/\(([^)]+)\)\s*$/);
  return {
    text: value.replace(/\s*\([^)]+\)\s*$/, "").trim(),
    note: match?.[1]?.trim() ?? null,
  };
}

function cleanNotesLine(value: string) {
  return value.replace(/^[-*•]\s*/, "").trim();
}

function extractQuantity(value: string) {
  const parenMatch = value.match(/\(x(\d+)\)\s*$/i);
  if (parenMatch) {
    return { text: value.replace(/\s*\(x\d+\)\s*$/i, "").trim(), quantity: parseInt(parenMatch[1], 10) };
  }
  const suffixMatch = value.match(/\sx(\d+)\s*$/i);
  if (suffixMatch) {
    return { text: value.replace(/\sx\d+\s*$/i, "").trim(), quantity: parseInt(suffixMatch[1], 10) };
  }
  return { text: value.trim(), quantity: 1 };
}

function inferBrand(value: string) {
  const match = KNOWN_BRANDS.find((brand) => value.startsWith(brand));
  if (match) return match;
  return value.split(" ").slice(0, 1).join(" ");
}

function inferPrinterRecord(line: string) {
  const name = line.trim();
  const brand = inferBrand(name);
  const model = name.replace(`${brand} `, "").trim();
  const volume = defaultPrinterBuildVolume(model);
  return {
    name,
    brand,
    model,
    buildVolumeX: String(volume.x),
    buildVolumeY: String(volume.y),
    buildVolumeZ: String(volume.z),
    status: "ACTIVE",
  };
}

function inferMaterialSystemRecord(line: string) {
  const { text, note } = extractBracketNote(line);
  const lower = text.toLowerCase();
  let type = "DRYER";
  if (lower.includes("ams lite")) type = "AMS_LITE";
  else if (lower.includes("ams 2")) type = "AMS_2_PRO";
  else if (lower.includes("ams ht")) type = "AMS_HT";

  return {
    name: text,
    type,
    status: "ACTIVE",
    notes: note ?? "",
  };
}

function inferBuildPlateRecord(line: string) {
  const { text, note } = extractBracketNote(line);
  const sizeMatch = text.match(/(\d{3})mm/i);
  const lower = text.toLowerCase();
  let surfaceType = "General";
  if (lower.includes("dual textured/smooth")) surfaceType = "Dual Textured/Smooth";
  else if (lower.includes("textured")) surfaceType = "Textured";
  else if (lower.includes("smooth")) surfaceType = "Smooth";
  else if (lower.includes("engineering")) surfaceType = "Engineering";
  else if (lower.includes("cool plate")) surfaceType = "Cool Plate";

  return {
    name: text,
    sizeLabel: sizeMatch ? `${sizeMatch[1]}mm` : "256mm",
    sizeMm: sizeMatch?.[1] ?? "256",
    surfaceType,
    status: "AVAILABLE",
    notes: note ?? "",
  };
}

function inferHotendRecord(line: string) {
  const { text: withoutNote, note } = extractBracketNote(line);
  const { text, quantity } = extractQuantity(withoutNote);
  const nozzleMatch = text.match(/(\d+(?:\.\d+)?)mm/i);
  const lower = text.toLowerCase();
  const materialType = lower.includes("hardened steel")
    ? "Hardened Steel"
    : lower.includes("stainless")
      ? "Stainless"
      : "Standard";
  const noteLower = (note ?? "").toLowerCase();
  const inUseCount =
    noteLower.includes("one in use") ? 1 : noteLower.includes("in use") ? 1 : 0;

  return {
    name: text,
    nozzleSize: nozzleMatch?.[1] ?? "0.4",
    materialType,
    quantity: String(quantity),
    inUseCount: String(inUseCount),
    spareCount: String(Math.max(0, quantity - inUseCount)),
    status: inUseCount > 0 ? "IN_USE" : "AVAILABLE",
    notes: note ?? "",
  };
}

function inferFilamentRecord(line: string) {
  const { text: noNote, note } = extractBracketNote(cleanNotesLine(line));
  const { text, quantity } = extractQuantity(noNote);
  const brand = inferBrand(text);
  const remainder = text.replace(`${brand} `, "").trim();
  const patterns = [
    { materialType: "PETG-CF", token: "PETG-CF" },
    { materialType: "PETG", token: "PETG HF", subtype: "HF" },
    { materialType: "PLA", token: "PLA+", subtype: "PLA+" },
    { materialType: "PLA", token: "PLA" },
    { materialType: "PETG", token: "PETG" },
    { materialType: "ASA", token: "ASA" },
    { materialType: "TPU", token: "TPU" },
  ];
  const matched = patterns.find((pattern) => remainder.includes(pattern.token)) ?? patterns[3];
  const [before, after = ""] = remainder.split(matched.token);
  const finishTokens = ["Matte", "Silk", "Meta", "Metal", "Metallic"];
  const subtype = matched.subtype ?? (after.trim() || null);
  const finish = finishTokens.find((token) => before.includes(token) || after.includes(token)) ?? null;
  const color = before.replace(/\b(Matte|Silk|Meta|Metal)\b/gi, "").trim() || remainder;
  const lower = remainder.toLowerCase();
  const abrasive = lower.includes("cf");
  const dryingRequired = abrasive || matched.materialType === "ASA" || matched.materialType === "TPU";
  const hygroscopicLevel =
    abrasive || matched.materialType === "ASA" || matched.materialType === "TPU"
      ? "HIGH"
      : matched.materialType === "PETG"
        ? "MEDIUM"
        : "LOW";

  return {
    brand,
    materialType: matched.materialType,
    subtype: subtype ?? "",
    finish: finish ?? "",
    color,
    quantity: String(quantity),
    estimatedRemainingGrams: "1000",
    abrasive: abrasive ? "true" : "false",
    dryingRequired: dryingRequired ? "true" : "false",
    hygroscopicLevel,
    status: quantity <= 1 ? "HEALTHY" : "HEALTHY",
    notes: note ?? "",
  };
}

function inferConsumableRecord(line: string, section: string) {
  const { text: withoutNote, note } = extractBracketNote(cleanNotesLine(line));
  const { text, quantity } = extractQuantity(withoutNote);
  return {
    name: text,
    category: sectionCategoryName(section),
    quantity: String(quantity),
    unit: "unit",
    reorderThreshold: "1",
    status: quantity <= 1 ? "LOW" : "HEALTHY",
    notes: note ?? "",
  };
}

function inferSafetyRecord(line: string) {
  const { text, note } = extractBracketNote(cleanNotesLine(line));
  const lower = text.toLowerCase();
  const type = lower.includes("filter")
    ? "Air Filter"
    : lower.includes("fan") || lower.includes("exhaust")
      ? "Exhaust"
      : "Air Quality";
  return {
    name: text,
    type,
    status: "ACTIVE",
    notes: note ?? "",
  };
}

function inferSmartPlugRecord(line: string) {
  const cleaned = cleanNotesLine(line);
  return {
    name: cleaned,
    assignedDeviceLabel: cleaned,
    status: "ONLINE",
    powerMonitoringCapable: "false",
  };
}

function inferToolRecord(line: string, section: string) {
  const { text: withoutNote, note } = extractBracketNote(cleanNotesLine(line));
  const { text, quantity } = extractQuantity(withoutNote);
  return {
    name: text,
    category: section.includes("Structural") ? "Structural Component" : "Tools / Parts",
    quantity: String(quantity),
    notes: note ?? "",
  };
}

function inferWishlistRecord(line: string, category: string) {
  const cleaned = cleanNotesLine(line);
  const urlMatch = cleaned.match(/\((https?:\/\/[^)]+)\)\s*$/i);
  const name = cleaned.replace(/\s*\(https?:\/\/[^)]+\)\s*$/i, "").trim();
  let vendor = "";
  if (urlMatch) {
    try {
      vendor = new URL(urlMatch[1]).hostname.replace(/^www\./, "");
    } catch {
      vendor = "";
    }
  }
  const priority =
    category === "Air Quality & Safety" ? "HIGH" : category === "Filament" ? "HIGH" : "MEDIUM";
  return {
    name,
    category,
    priority,
    vendor,
    purchaseUrl: urlMatch?.[1] ?? "",
    status: "PLANNED",
  };
}

export function parseInventoryNotes(text: string): NotesImportGroup[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const groups = new Map<string, NotesImportGroup>();
  const push = (
    entityType: ImportEntityType,
    sectionLabel: string,
    record: Record<string, string>,
  ) => {
    const groupKey = `${entityType}:${slugify(sectionLabel)}`;
    const existing = groups.get(groupKey);
    if (existing) {
      existing.records.push(record);
      return;
    }

    groups.set(groupKey, {
      groupKey,
      entityType,
      sectionLabel,
      sourceName: `Notes paste ${sectionLabel}`,
      records: [record],
    });
  };

  let section: string | null = null;
  let wishlistCategory: string | null = null;

  const isSectionHeading = (line: string) =>
    [
      "Printers",
      "Automatic Material System (AMS) / Dryers",
      "Automatic Material System (AMS) / Dryers:",
      "Build Plates",
      "Hotends",
      "Filament",
      "Filament:",
      "Consumables & Maintenance",
      "Safety & Air Quality",
      "Extra Structural Printer Components",
      "Smart Plugs",
      "Related Tools and Parts",
      "Items to Buy:",
      "Filament:",
      "Workspace:",
      "Air Quality & Safety:",
    ].includes(line);

  for (const line of lines) {
    if (line === "3D Printing Setup") {
      continue;
    }

    if (isSectionHeading(line)) {
      if (line === "Items to Buy:") {
        section = "Wishlist";
        wishlistCategory = null;
      } else if (section === "Wishlist" && line.endsWith(":")) {
        wishlistCategory = line.replace(/:$/, "");
      } else {
        section = line.replace(/:$/, "");
      }
      continue;
    }

    if (!section) continue;

    if (section === "Printers") push(IMPORT_ENTITY_TYPES.PRINTER, section, inferPrinterRecord(cleanNotesLine(line)));
    else if (section === "Automatic Material System (AMS) / Dryers") push(IMPORT_ENTITY_TYPES.MATERIAL_SYSTEM, section, inferMaterialSystemRecord(cleanNotesLine(line)));
    else if (section === "Build Plates") push(IMPORT_ENTITY_TYPES.BUILD_PLATE, section, inferBuildPlateRecord(cleanNotesLine(line)));
    else if (section === "Hotends") push(IMPORT_ENTITY_TYPES.HOTEND, section, inferHotendRecord(cleanNotesLine(line)));
    else if (section === "Filament") push(IMPORT_ENTITY_TYPES.FILAMENT, section, inferFilamentRecord(cleanNotesLine(line)));
    else if (section === "Consumables & Maintenance") push(IMPORT_ENTITY_TYPES.CONSUMABLE, section, inferConsumableRecord(line, section));
    else if (section === "Safety & Air Quality") push(IMPORT_ENTITY_TYPES.SAFETY, section, inferSafetyRecord(cleanNotesLine(line)));
    else if (section === "Smart Plugs") push(IMPORT_ENTITY_TYPES.SMART_PLUG, section, inferSmartPlugRecord(cleanNotesLine(line)));
    else if (section === "Extra Structural Printer Components" || section === "Related Tools and Parts") {
      push(IMPORT_ENTITY_TYPES.TOOL_PART, section, inferToolRecord(line, section));
    } else if (section === "Wishlist" && wishlistCategory && line.startsWith("-")) {
      push(IMPORT_ENTITY_TYPES.WISHLIST, `Wishlist · ${wishlistCategory}`, inferWishlistRecord(line, wishlistCategory));
    }
  }

  return Array.from(groups.values());
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
      resolution: IMPORT_ROW_RESOLUTIONS.SKIP,
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
        ? IMPORT_ROW_RESOLUTIONS.SKIP
        : match
          ? IMPORT_ROW_RESOLUTIONS.UPDATE_MATCH
          : IMPORT_ROW_RESOLUTIONS.CREATE_NEW;

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

async function stagePrinterRows(
  workspaceId: string,
  records: Record<string, string>[],
): Promise<StagedRow[]> {
  const existing = await prisma.printer.findMany({
    where: { workspaceId },
    select: { id: true, slug: true },
  });

  const rows = records.map((record, index) => {
    const name = record.name?.trim();
    const brand = record.brand?.trim();
    const model = record.model?.trim();
    const validationErrors: string[] = [];
    if (!name) validationErrors.push("name is required");
    if (!brand) validationErrors.push("brand is required");
    if (!model) validationErrors.push("model is required");

    const fingerprint = slugify(name ?? `row-${index + 1}`);
    const match = existing.find((item) => item.slug === fingerprint);
    const status =
      validationErrors.length > 0 ? ImportRowStatus.ERROR : match ? ImportRowStatus.MATCHED : ImportRowStatus.NEW;
    const buildVolume = defaultPrinterBuildVolume(model ?? "");

    return {
      rowIndex: index + 1,
      status,
      resolution: buildRowResolution(status, Boolean(match)),
      fingerprint,
      suggestedMatchId: match?.id,
      suggestedMatchSlug: match?.slug,
      resolvedMatchId: match?.id,
      resolvedMatchSlug: match?.slug,
      validationErrors,
      data: {
        name,
        brand,
        model,
        buildVolumeX: parseInteger(record.buildVolumeX, buildVolume.x),
        buildVolumeY: parseInteger(record.buildVolumeY, buildVolume.y),
        buildVolumeZ: parseInteger(record.buildVolumeZ, buildVolume.z),
        location: parseOptionalString(record.location),
        status: parsePrinterStatus(record.status, validationErrors),
        notes: parseOptionalString(record.notes),
      },
    };
  });

  return finalizeRows(rows);
}

async function stageMaterialSystemRows(
  workspaceId: string,
  records: Record<string, string>[],
): Promise<StagedRow[]> {
  const existing = await prisma.materialSystem.findMany({
    where: { workspaceId },
    select: { id: true, slug: true },
  });

  const rows = records.map((record, index) => {
    const name = record.name?.trim();
    const validationErrors: string[] = [];
    if (!name) validationErrors.push("name is required");

    const fingerprint = slugify(name ?? `row-${index + 1}`);
    const match = existing.find((item) => item.slug === fingerprint);
    const status =
      validationErrors.length > 0 ? ImportRowStatus.ERROR : match ? ImportRowStatus.MATCHED : ImportRowStatus.NEW;

    return {
      rowIndex: index + 1,
      status,
      resolution: buildRowResolution(status, Boolean(match)),
      fingerprint,
      suggestedMatchId: match?.id,
      suggestedMatchSlug: match?.slug,
      resolvedMatchId: match?.id,
      resolvedMatchSlug: match?.slug,
      validationErrors,
      data: {
        name,
        type: parseMaterialSystemType(record.type, validationErrors),
        status: parseMaterialSystemStatus(record.status, validationErrors),
        supportedMaterialsNotes: parseOptionalString(record.supportedMaterialsNotes),
        notes: parseOptionalString(record.notes),
      },
    };
  });

  return finalizeRows(rows);
}

async function stageBuildPlateRows(
  workspaceId: string,
  records: Record<string, string>[],
): Promise<StagedRow[]> {
  const existing = await prisma.buildPlate.findMany({
    where: { workspaceId },
    select: { id: true, slug: true },
  });

  const rows = records.map((record, index) => {
    const name = record.name?.trim();
    const sizeLabel = record.sizeLabel?.trim();
    const surfaceType = record.surfaceType?.trim();
    const validationErrors: string[] = [];
    if (!name) validationErrors.push("name is required");
    if (!sizeLabel) validationErrors.push("sizeLabel is required");
    if (!surfaceType) validationErrors.push("surfaceType is required");

    const fingerprint = slugify(name ?? `row-${index + 1}`);
    const match = existing.find((item) => item.slug === fingerprint);
    const status =
      validationErrors.length > 0 ? ImportRowStatus.ERROR : match ? ImportRowStatus.MATCHED : ImportRowStatus.NEW;

    return {
      rowIndex: index + 1,
      status,
      resolution: buildRowResolution(status, Boolean(match)),
      fingerprint,
      suggestedMatchId: match?.id,
      suggestedMatchSlug: match?.slug,
      resolvedMatchId: match?.id,
      resolvedMatchSlug: match?.slug,
      validationErrors,
      data: {
        name,
        sizeLabel,
        sizeMm: parseInteger(record.sizeMm, parseInteger(sizeLabel?.replace(/[^\d]/g, ""), 256)),
        surfaceType,
        status: parseBuildPlateStatus(record.status, validationErrors),
        notes: parseOptionalString(record.notes),
      },
    };
  });

  return finalizeRows(rows);
}

async function stageHotendRows(
  workspaceId: string,
  records: Record<string, string>[],
): Promise<StagedRow[]> {
  const existing = await prisma.hotend.findMany({
    where: { workspaceId },
    select: { id: true, slug: true },
  });

  const rows = records.map((record, index) => {
    const name = record.name?.trim();
    const materialType = record.materialType?.trim();
    const validationErrors: string[] = [];
    if (!name) validationErrors.push("name is required");
    if (!materialType) validationErrors.push("materialType is required");

    const fingerprint = slugify(name ?? `row-${index + 1}`);
    const match = existing.find((item) => item.slug === fingerprint);
    const status =
      validationErrors.length > 0 ? ImportRowStatus.ERROR : match ? ImportRowStatus.MATCHED : ImportRowStatus.NEW;
    const quantity = parseInteger(record.quantity, 1);
    const inUseCount = parseInteger(record.inUseCount, 0);

    return {
      rowIndex: index + 1,
      status,
      resolution: buildRowResolution(status, Boolean(match)),
      fingerprint,
      suggestedMatchId: match?.id,
      suggestedMatchSlug: match?.slug,
      resolvedMatchId: match?.id,
      resolvedMatchSlug: match?.slug,
      validationErrors,
      data: {
        name,
        nozzleSize: parseDecimal(record.nozzleSize, 0.4),
        materialType,
        quantity,
        inUseCount,
        spareCount: parseInteger(record.spareCount, Math.max(0, quantity - inUseCount)),
        status: parseHotendStatus(record.status, validationErrors),
        notes: parseOptionalString(record.notes),
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
        ? IMPORT_ROW_RESOLUTIONS.SKIP
        : match
          ? IMPORT_ROW_RESOLUTIONS.UPDATE_MATCH
          : IMPORT_ROW_RESOLUTIONS.CREATE_NEW;

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
        ? IMPORT_ROW_RESOLUTIONS.SKIP
        : match
          ? IMPORT_ROW_RESOLUTIONS.UPDATE_MATCH
          : IMPORT_ROW_RESOLUTIONS.CREATE_NEW;

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
        ? IMPORT_ROW_RESOLUTIONS.SKIP
        : match
          ? IMPORT_ROW_RESOLUTIONS.UPDATE_MATCH
          : IMPORT_ROW_RESOLUTIONS.CREATE_NEW;

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

async function stageSafetyRows(
  workspaceId: string,
  records: Record<string, string>[],
): Promise<StagedRow[]> {
  const existing = await prisma.safetyEquipment.findMany({
    where: { workspaceId },
    select: { id: true, slug: true },
  });

  const rows = records.map((record, index) => {
    const name = record.name?.trim();
    const type = record.type?.trim();
    const validationErrors: string[] = [];
    if (!name) validationErrors.push("name is required");
    if (!type) validationErrors.push("type is required");

    const fingerprint = slugify(name ?? `row-${index + 1}`);
    const match = existing.find((item) => item.slug === fingerprint);
    const status =
      validationErrors.length > 0 ? ImportRowStatus.ERROR : match ? ImportRowStatus.MATCHED : ImportRowStatus.NEW;

    return {
      rowIndex: index + 1,
      status,
      resolution: buildRowResolution(status, Boolean(match)),
      fingerprint,
      suggestedMatchId: match?.id,
      suggestedMatchSlug: match?.slug,
      resolvedMatchId: match?.id,
      resolvedMatchSlug: match?.slug,
      validationErrors,
      data: {
        name,
        type,
        status: parseSafetyStatus(record.status, validationErrors),
        replacementSchedule: parseOptionalString(record.replacementSchedule),
        notes: parseOptionalString(record.notes),
      },
    };
  });

  return finalizeRows(rows);
}

async function stageSmartPlugRows(
  workspaceId: string,
  records: Record<string, string>[],
): Promise<StagedRow[]> {
  const existing = await prisma.smartPlug.findMany({
    where: { workspaceId },
    select: { id: true, slug: true },
  });

  const rows = records.map((record, index) => {
    const name = record.name?.trim();
    const validationErrors: string[] = [];
    if (!name) validationErrors.push("name is required");

    const fingerprint = slugify(name ?? `row-${index + 1}`);
    const match = existing.find((item) => item.slug === fingerprint);
    const status =
      validationErrors.length > 0 ? ImportRowStatus.ERROR : match ? ImportRowStatus.MATCHED : ImportRowStatus.NEW;

    return {
      rowIndex: index + 1,
      status,
      resolution: buildRowResolution(status, Boolean(match)),
      fingerprint,
      suggestedMatchId: match?.id,
      suggestedMatchSlug: match?.slug,
      resolvedMatchId: match?.id,
      resolvedMatchSlug: match?.slug,
      validationErrors,
      data: {
        name,
        assignedDeviceLabel: parseOptionalString(record.assignedDeviceLabel),
        status: parseSmartPlugStatus(record.status, validationErrors),
        powerMonitoringCapable: parseBoolean(record.powerMonitoringCapable),
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
    case IMPORT_ENTITY_TYPES.PRINTER:
      return stagePrinterRows(workspaceId, mappedRecords);
    case IMPORT_ENTITY_TYPES.MATERIAL_SYSTEM:
      return stageMaterialSystemRows(workspaceId, mappedRecords);
    case IMPORT_ENTITY_TYPES.BUILD_PLATE:
      return stageBuildPlateRows(workspaceId, mappedRecords);
    case IMPORT_ENTITY_TYPES.HOTEND:
      return stageHotendRows(workspaceId, mappedRecords);
    case IMPORT_ENTITY_TYPES.FILAMENT:
      return stageFilamentRows(workspaceId, mappedRecords);
    case IMPORT_ENTITY_TYPES.CONSUMABLE:
      return stageConsumableRows(workspaceId, mappedRecords);
    case IMPORT_ENTITY_TYPES.SAFETY:
      return stageSafetyRows(workspaceId, mappedRecords);
    case IMPORT_ENTITY_TYPES.SMART_PLUG:
      return stageSmartPlugRows(workspaceId, mappedRecords);
    case IMPORT_ENTITY_TYPES.TOOL_PART:
      return stageToolRows(workspaceId, mappedRecords);
    case IMPORT_ENTITY_TYPES.WISHLIST:
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
  const prismaEntityType = toPrismaImportEntityType(args.entityType);

  return prisma.importJob.create({
    data: {
      workspaceId: args.workspaceId,
      createdByUserId: args.userId,
      entityType: prismaEntityType,
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
          entityType: prismaEntityType,
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

      if (row.resolution === IMPORT_ROW_RESOLUTIONS.SKIP) {
        continue;
      }

      const payload = row.data as Record<string, unknown>;

      if (job.entityType === IMPORT_ENTITY_TYPES.PRINTER) {
        const common = {
          name: String(payload.name ?? ""),
          slug: slugify(String(payload.name ?? "")),
          brand: String(payload.brand ?? ""),
          model: String(payload.model ?? ""),
          buildVolumeX: Number(payload.buildVolumeX ?? 256),
          buildVolumeY: Number(payload.buildVolumeY ?? 256),
          buildVolumeZ: Number(payload.buildVolumeZ ?? 256),
          location: (payload.location as string | null) ?? null,
          status: String(payload.status ?? PrinterStatus.ACTIVE) as PrinterStatus,
          notes: (payload.notes as string | null) ?? null,
        };

        if (row.resolution === IMPORT_ROW_RESOLUTIONS.UPDATE_MATCH && row.resolvedMatchId) {
          await tx.printer.update({
            where: { id: row.resolvedMatchId },
            data: common,
          });
        } else {
          await tx.printer.create({
            data: { workspaceId, ...common },
          });
        }
      }

      if (job.entityType === IMPORT_ENTITY_TYPES.MATERIAL_SYSTEM) {
        const common = {
          name: String(payload.name ?? ""),
          slug: slugify(String(payload.name ?? "")),
          type: String(payload.type ?? MaterialSystemType.DRYER) as MaterialSystemType,
          status: String(payload.status ?? MaterialSystemStatus.ACTIVE) as MaterialSystemStatus,
          supportedMaterialsNotes: (payload.supportedMaterialsNotes as string | null) ?? null,
          notes: (payload.notes as string | null) ?? null,
        };

        if (row.resolution === IMPORT_ROW_RESOLUTIONS.UPDATE_MATCH && row.resolvedMatchId) {
          await tx.materialSystem.update({
            where: { id: row.resolvedMatchId },
            data: common,
          });
        } else {
          await tx.materialSystem.create({
            data: { workspaceId, ...common },
          });
        }
      }

      if (job.entityType === IMPORT_ENTITY_TYPES.BUILD_PLATE) {
        const common = {
          name: String(payload.name ?? ""),
          slug: slugify(String(payload.name ?? "")),
          sizeLabel: String(payload.sizeLabel ?? ""),
          sizeMm: Number(payload.sizeMm ?? 256),
          surfaceType: String(payload.surfaceType ?? ""),
          status: String(payload.status ?? BuildPlateStatus.AVAILABLE) as BuildPlateStatus,
          notes: (payload.notes as string | null) ?? null,
        };

        if (row.resolution === IMPORT_ROW_RESOLUTIONS.UPDATE_MATCH && row.resolvedMatchId) {
          await tx.buildPlate.update({
            where: { id: row.resolvedMatchId },
            data: common,
          });
        } else {
          await tx.buildPlate.create({
            data: { workspaceId, ...common },
          });
        }
      }

      if (job.entityType === IMPORT_ENTITY_TYPES.HOTEND) {
        const common = {
          name: String(payload.name ?? ""),
          slug: slugify(String(payload.name ?? "")),
          nozzleSize: Number(payload.nozzleSize ?? 0.4),
          materialType: String(payload.materialType ?? ""),
          quantity: Number(payload.quantity ?? 1),
          inUseCount: Number(payload.inUseCount ?? 0),
          spareCount: Number(payload.spareCount ?? 0),
          status: String(payload.status ?? HotendStatus.AVAILABLE) as HotendStatus,
          notes: (payload.notes as string | null) ?? null,
        };

        if (row.resolution === IMPORT_ROW_RESOLUTIONS.UPDATE_MATCH && row.resolvedMatchId) {
          await tx.hotend.update({
            where: { id: row.resolvedMatchId },
            data: common,
          });
        } else {
          await tx.hotend.create({
            data: { workspaceId, ...common },
          });
        }
      }

      if (job.entityType === IMPORT_ENTITY_TYPES.FILAMENT) {
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

        if (row.resolution === IMPORT_ROW_RESOLUTIONS.UPDATE_MATCH && row.resolvedMatchId) {
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

      if (job.entityType === IMPORT_ENTITY_TYPES.CONSUMABLE) {
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
        if (row.resolution === IMPORT_ROW_RESOLUTIONS.UPDATE_MATCH && row.resolvedMatchId) {
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

      if (job.entityType === IMPORT_ENTITY_TYPES.SAFETY) {
        const common = {
          name: String(payload.name ?? ""),
          slug: slugify(String(payload.name ?? "")),
          type: String(payload.type ?? ""),
          status: String(payload.status ?? SafetyStatus.ACTIVE) as SafetyStatus,
          replacementSchedule: (payload.replacementSchedule as string | null) ?? null,
          notes: (payload.notes as string | null) ?? null,
        };
        if (row.resolution === IMPORT_ROW_RESOLUTIONS.UPDATE_MATCH && row.resolvedMatchId) {
          await tx.safetyEquipment.update({
            where: { id: row.resolvedMatchId },
            data: common,
          });
        } else {
          await tx.safetyEquipment.create({
            data: { workspaceId, ...common },
          });
        }
      }

      if (job.entityType === IMPORT_ENTITY_TYPES.SMART_PLUG) {
        const common = {
          name: String(payload.name ?? ""),
          slug: slugify(String(payload.name ?? "")),
          assignedDeviceLabel: (payload.assignedDeviceLabel as string | null) ?? null,
          status: String(payload.status ?? SmartPlugStatus.ONLINE) as SmartPlugStatus,
          powerMonitoringCapable: Boolean(payload.powerMonitoringCapable),
          notes: (payload.notes as string | null) ?? null,
        };
        if (row.resolution === IMPORT_ROW_RESOLUTIONS.UPDATE_MATCH && row.resolvedMatchId) {
          await tx.smartPlug.update({
            where: { id: row.resolvedMatchId },
            data: common,
          });
        } else {
          await tx.smartPlug.create({
            data: { workspaceId, ...common },
          });
        }
      }

      if (job.entityType === IMPORT_ENTITY_TYPES.TOOL_PART) {
        const common = {
          name: String(payload.name ?? ""),
          slug: slugify(String(payload.name ?? "")),
          category: String(payload.category ?? ""),
          quantity: Number(payload.quantity ?? 1),
          storageLocation: (payload.storageLocation as string | null) ?? null,
          notes: (payload.notes as string | null) ?? null,
        };
        if (row.resolution === IMPORT_ROW_RESOLUTIONS.UPDATE_MATCH && row.resolvedMatchId) {
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

      if (job.entityType === IMPORT_ENTITY_TYPES.WISHLIST) {
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
        if (row.resolution === IMPORT_ROW_RESOLUTIONS.UPDATE_MATCH && row.resolvedMatchId) {
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
