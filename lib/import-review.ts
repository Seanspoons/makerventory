import type { ImportEntityType, ImportRowStatus } from "@prisma/client";
import { formatEntityName, titleCase } from "@/lib/utils";

type ComparisonField = {
  key: string;
  label: string;
};

export type ImportRowReview = {
  severity: "blocker" | "warning" | "info" | "safe";
  title: string;
  detail: string;
  reasons: string[];
  diffFields: Array<{
    key: string;
    label: string;
    incoming: string;
    current: string;
  }>;
  currentLabel: string | null;
};

const comparisonFields: Record<ImportEntityType, ComparisonField[]> = {
  PRINTER: [
    { key: "name", label: "Name" },
    { key: "brand", label: "Brand" },
    { key: "model", label: "Model" },
    { key: "buildVolumeX", label: "Build volume X" },
    { key: "buildVolumeY", label: "Build volume Y" },
    { key: "buildVolumeZ", label: "Build volume Z" },
    { key: "location", label: "Location" },
    { key: "status", label: "Status" },
  ],
  MATERIAL_SYSTEM: [
    { key: "name", label: "Name" },
    { key: "type", label: "Type" },
    { key: "status", label: "Status" },
    { key: "supportedMaterialsNotes", label: "Supported materials notes" },
  ],
  BUILD_PLATE: [
    { key: "name", label: "Name" },
    { key: "sizeMm", label: "Size" },
    { key: "surfaceType", label: "Surface type" },
    { key: "status", label: "Status" },
  ],
  HOTEND: [
    { key: "name", label: "Name" },
    { key: "nozzleSize", label: "Nozzle size" },
    { key: "materialType", label: "Material type" },
    { key: "quantity", label: "Quantity" },
    { key: "status", label: "Status" },
  ],
  FILAMENT: [
    { key: "brand", label: "Brand" },
    { key: "materialType", label: "Material type" },
    { key: "color", label: "Color" },
    { key: "quantity", label: "Quantity" },
    { key: "estimatedRemainingGrams", label: "Remaining grams" },
    { key: "abrasive", label: "Abrasive" },
    { key: "dryingRequired", label: "Drying required" },
    { key: "hygroscopicLevel", label: "Hygroscopic level" },
  ],
  CONSUMABLE: [
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
    { key: "quantity", label: "Quantity" },
    { key: "unit", label: "Unit" },
    { key: "reorderThreshold", label: "Reorder threshold" },
    { key: "storageLocation", label: "Storage location" },
  ],
  SAFETY: [
    { key: "name", label: "Name" },
    { key: "type", label: "Type" },
    { key: "status", label: "Status" },
    { key: "replacementSchedule", label: "Replacement schedule" },
  ],
  SMART_PLUG: [
    { key: "name", label: "Name" },
    { key: "assignedDeviceLabel", label: "Assigned device" },
    { key: "status", label: "Status" },
    { key: "powerMonitoringCapable", label: "Power monitoring" },
  ],
  TOOL_PART: [
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
    { key: "quantity", label: "Quantity" },
    { key: "storageLocation", label: "Storage location" },
  ],
  WISHLIST: [
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
    { key: "priority", label: "Priority" },
    { key: "estimatedCost", label: "Estimated cost" },
    { key: "vendor", label: "Vendor" },
    { key: "status", label: "Status" },
  ],
};

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.map((item) => stringifyValue(item)).filter(Boolean).join(", ");
  }

  return String(value);
}

export function buildImportRowReview(args: {
  entityType: ImportEntityType;
  status: ImportRowStatus;
  resolution: "CREATE_NEW" | "UPDATE_MATCH" | "SKIP";
  suggestedMatchSlug: string | null;
  validationErrors: string[];
  data: Record<string, unknown>;
  currentRecord?: Record<string, unknown> | null;
}) {
  const currentRecord = args.currentRecord ?? null;
  const fields = comparisonFields[args.entityType];
  const diffFields = currentRecord
    ? fields
        .map((field) => ({
          key: field.key,
          label: field.label,
          incoming: stringifyValue(args.data[field.key]),
          current: stringifyValue(currentRecord[field.key]),
        }))
        .filter((field) => field.incoming !== field.current)
    : [];

  const currentLabel = currentRecord ? describeRecordLabel(args.entityType, currentRecord) : null;
  const reasons = currentRecord
    ? describeMatchReasons(args.entityType, args.data, currentRecord)
    : [];

  if (args.status === "ERROR" || args.status === "CONFLICT") {
    return {
      severity: "blocker" as const,
      title: "Blocked from apply",
      detail: args.validationErrors[0] ?? "This row needs correction before it can safely apply.",
      reasons,
      diffFields,
      currentLabel,
    };
  }

  if (args.status === "APPLIED") {
    return {
      severity: "info" as const,
      title: "Already applied",
      detail: "This row has already been written into your workspace inventory.",
      reasons,
      diffFields,
      currentLabel,
    };
  }

  if (args.resolution === "SKIP" || args.status === "SKIPPED") {
    return {
      severity: "info" as const,
      title: "Out of apply set",
      detail: "This row is staged for later and will not change inventory until you re-queue it.",
      reasons,
      diffFields,
      currentLabel,
    };
  }

  if (currentRecord) {
    if (diffFields.length === 0) {
      return {
        severity: "warning" as const,
        title: "Likely duplicate",
        detail: "Incoming values already match an existing record. Review whether this should stay skipped instead of updating.",
        reasons,
        diffFields,
        currentLabel,
      };
    }

    return {
      severity: "warning" as const,
      title: "Review before update",
      detail: `${diffFields.length} field difference${diffFields.length === 1 ? "" : "s"} detected against the matched record.`,
      reasons,
      diffFields,
      currentLabel,
    };
  }

  return {
    severity: "safe" as const,
    title: "Ready to create",
    detail: "No matching record was found. This row is ready to create a new inventory item.",
    reasons: [`No existing ${formatEntityName(args.entityType).toLowerCase()} matched this row.`],
    diffFields,
    currentLabel,
  };
}

function describeRecordLabel(entityType: ImportEntityType, record: Record<string, unknown>) {
  if (entityType === "FILAMENT") {
    return [record.brand, record.color, record.materialType].filter(Boolean).join(" ");
  }

  if (entityType === "WISHLIST") {
    return [record.name, record.category].filter(Boolean).join(" · ");
  }

  return stringifyValue(record.name) || null;
}

function describeMatchReasons(
  entityType: ImportEntityType,
  incoming: Record<string, unknown>,
  current: Record<string, unknown>,
) {
  const reasons: string[] = [];
  const singularNames: Record<ImportEntityType, string> = {
    PRINTER: "printer",
    MATERIAL_SYSTEM: "material system",
    BUILD_PLATE: "build plate",
    HOTEND: "hotend",
    FILAMENT: "filament spool",
    CONSUMABLE: "consumable",
    SAFETY: "safety item",
    SMART_PLUG: "smart plug",
    TOOL_PART: "tool or part",
    WISHLIST: "wishlist item",
  };

  if (stringifyValue(incoming.name) && stringifyValue(incoming.name) === stringifyValue(current.name)) {
    reasons.push(`Same ${singularNames[entityType]} name already exists.`);
  }

  if (
    entityType === "BUILD_PLATE" &&
    stringifyValue(incoming.sizeMm) === stringifyValue(current.sizeMm) &&
    stringifyValue(incoming.surfaceType) === stringifyValue(current.surfaceType)
  ) {
    reasons.push("Same build size and surface type match an existing build plate.");
  }

  if (
    entityType === "HOTEND" &&
    stringifyValue(incoming.nozzleSize) === stringifyValue(current.nozzleSize) &&
    stringifyValue(incoming.materialType) === stringifyValue(current.materialType)
  ) {
    reasons.push("Same nozzle size and material type match an existing hotend.");
  }

  if (
    entityType === "FILAMENT" &&
    stringifyValue(incoming.brand) === stringifyValue(current.brand) &&
    stringifyValue(incoming.materialType) === stringifyValue(current.materialType) &&
    stringifyValue(incoming.color) === stringifyValue(current.color)
  ) {
    reasons.push("Same brand, material, and color already exist in filament inventory.");
  }

  if (
    entityType === "CONSUMABLE" &&
    stringifyValue(incoming.name) === stringifyValue(current.name) &&
    stringifyValue(incoming.category) === stringifyValue(current.category)
  ) {
    reasons.push("Same consumable name and category already exist.");
  }

  if (
    entityType === "SMART_PLUG" &&
    stringifyValue(incoming.name) === stringifyValue(current.name)
  ) {
    reasons.push("Same smart plug name already exists.");
  }

  if (reasons.length === 0) {
    reasons.push("This row matched an existing record with the same identity fingerprint.");
  }

  return reasons;
}
