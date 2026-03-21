import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeStock(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "Untracked";
  }

  return `${value.toLocaleString()} g`;
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "TBD";
  }

  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function titleCase(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatMaterialSystemType(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  const labels: Record<string, string> = {
    AMS_LITE: "AMS Lite",
    AMS_2_PRO: "AMS 2 Pro",
    AMS_HT: "AMS HT",
    DRYER: "Dryer",
  };

  return labels[value] ?? titleCase(value);
}

export function formatBuildPlateSize(sizeMm: number | null | undefined) {
  if (!sizeMm || !Number.isFinite(sizeMm)) {
    return "Unknown size";
  }

  return `${sizeMm.toString()} mm`;
}

export function deriveConsumableStatus(quantity: number, reorderThreshold: number) {
  if (quantity <= 0) {
    return "OUT" as const;
  }

  const normalizedThreshold = reorderThreshold > 0 ? reorderThreshold : 1;
  const ratio = quantity / normalizedThreshold;

  if (ratio <= 1.25) {
    return "LOW" as const;
  }

  return "HEALTHY" as const;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
