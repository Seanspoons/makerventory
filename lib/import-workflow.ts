import { ImportRowStatus } from "@prisma/client";
import type { ImportRowResolution } from "@prisma/client";

export type BulkImportOperation =
  | "set_matched_update"
  | "set_unmatched_create"
  | "skip_ready";

export type ImportRowStateLike = {
  id: string;
  status: ImportRowStatus;
  resolution: ImportRowResolution;
  suggestedMatchId?: string | null;
  suggestedMatchSlug?: string | null;
  resolvedMatchId?: string | null;
  resolvedMatchSlug?: string | null;
  validationErrors?: string[];
  data?: unknown;
};

export type ImportBulkUndoSnapshot = {
  operation: BulkImportOperation;
  updatedRows: number;
  createdAt: string;
  rows: Array<{
    id: string;
    status: ImportRowStatus;
    resolution: ImportRowResolution;
    resolvedMatchId: string | null;
    resolvedMatchSlug: string | null;
  }>;
};

export function summarizeImportRows(rows: Array<{ status: string }>) {
  return {
    newRows: rows.filter((item) => item.status === "NEW").length,
    matchedRows: rows.filter((item) => item.status === "MATCHED").length,
    conflictRows: rows.filter((item) => item.status === "CONFLICT").length,
    skippedRows: rows.filter((item) => item.status === "SKIPPED" || item.status === "ERROR").length,
  };
}

export function canEditImportResolution(status: ImportRowStatus) {
  return (
    status !== ImportRowStatus.APPLIED &&
    status !== ImportRowStatus.ERROR &&
    status !== ImportRowStatus.CONFLICT
  );
}

export function countImportRowsByFilter(
  filter: "all" | "ready" | "matched" | "new" | "blocked" | "skipped" | "applied",
  rows: Array<{ status: ImportRowStatus }>,
) {
  if (filter === "all") return rows.length;
  if (filter === "ready") {
    return rows.filter((row) => row.status === ImportRowStatus.NEW || row.status === ImportRowStatus.MATCHED).length;
  }
  if (filter === "matched") return rows.filter((row) => row.status === ImportRowStatus.MATCHED).length;
  if (filter === "new") return rows.filter((row) => row.status === ImportRowStatus.NEW).length;
  if (filter === "blocked") {
    return rows.filter((row) => row.status === ImportRowStatus.CONFLICT || row.status === ImportRowStatus.ERROR).length;
  }
  if (filter === "skipped") return rows.filter((row) => row.status === ImportRowStatus.SKIPPED).length;
  if (filter === "applied") return rows.filter((row) => row.status === ImportRowStatus.APPLIED).length;
  return rows.length;
}

export function selectRowsForBulkOperation(
  rows: ImportRowStateLike[],
  operation: BulkImportOperation,
) {
  return rows.filter((row) => {
    if (row.status === "APPLIED" || row.status === "CONFLICT" || row.status === "ERROR") {
      return false;
    }

    const validationErrors = row.validationErrors ?? [];

    if (operation === "set_matched_update") {
      return Boolean(row.suggestedMatchId) && validationErrors.length === 0;
    }

    if (operation === "set_unmatched_create") {
      return !row.suggestedMatchId && validationErrors.length === 0;
    }

    return row.status === "NEW" || row.status === "MATCHED";
  });
}

export function buildImportBulkUndoSnapshot(
  operation: BulkImportOperation,
  rows: ImportRowStateLike[],
): ImportBulkUndoSnapshot {
  return {
    operation,
    updatedRows: rows.length,
    createdAt: new Date().toISOString(),
    rows: rows.map((row) => ({
      id: row.id,
      status: row.status,
      resolution: row.resolution,
      resolvedMatchId: row.resolvedMatchId ?? null,
      resolvedMatchSlug: row.resolvedMatchSlug ?? null,
    })),
  };
}

export function restoreRowsFromBulkUndo(snapshot: ImportBulkUndoSnapshot | null | undefined) {
  return snapshot?.rows ?? [];
}

export function buildCorrectionReviewRecords(
  rows: Array<{ data: unknown }>,
) {
  return rows.map((row) => {
    const payload = row.data as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(payload).map(([key, value]) => [
        key,
        value === null || value === undefined ? "" : String(value),
      ]),
    );
  });
}

export function resolutionLabel(resolution: ImportRowResolution) {
  if (resolution === "UPDATE_MATCH") return "Update matched item";
  if (resolution === "SKIP") return "Keep staged for later";
  return "Create as new item";
}
