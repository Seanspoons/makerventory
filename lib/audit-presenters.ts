export function summarizeAuditMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }

  const record = metadata as Record<string, unknown>;
  const rowsChanged =
    typeof record.updatedRows === "number"
      ? `${record.updatedRows} rows changed`
      : typeof record.restoredRows === "number"
        ? `${record.restoredRows} rows restored`
        : typeof record.totalRows === "number"
          ? `${record.totalRows} rows in job`
          : null;

  const sourceImport =
    typeof record.sourceImportJobId === "string" ? "Created from an earlier import job." : null;
  const mappingNote = record.previousRows ? "Previous row decisions were captured for recovery." : null;

  return [rowsChanged, sourceImport, mappingNote].filter((value): value is string => Boolean(value));
}
