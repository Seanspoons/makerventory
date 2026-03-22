import test from "node:test";
import assert from "node:assert/strict";
import { ImportRowStatus } from "@prisma/client";
import {
  buildCorrectionReviewRecords,
  buildImportBulkUndoSnapshot,
  canEditImportResolution,
  countImportRowsByFilter,
  resolutionLabel,
  restoreRowsFromBulkUndo,
  selectRowsForBulkOperation,
  summarizeImportRows,
} from "../lib/import-workflow";

const stagedRows = [
  {
    id: "matched",
    status: "MATCHED",
    resolution: "UPDATE_MATCH",
    suggestedMatchId: "printer-1",
    suggestedMatchSlug: "printer-1",
    resolvedMatchId: "printer-1",
    resolvedMatchSlug: "printer-1",
    validationErrors: [],
  },
  {
    id: "new",
    status: "NEW",
    resolution: "CREATE_NEW",
    suggestedMatchId: null,
    suggestedMatchSlug: null,
    resolvedMatchId: null,
    resolvedMatchSlug: null,
    validationErrors: [],
  },
  {
    id: "blocked",
    status: "ERROR",
    resolution: "CREATE_NEW",
    suggestedMatchId: null,
    suggestedMatchSlug: null,
    resolvedMatchId: null,
    resolvedMatchSlug: null,
    validationErrors: ["missing name"],
  },
] as const;

test("summarizeImportRows keeps blocked errors out of the ready counts", () => {
  assert.deepEqual(
    summarizeImportRows([
      { status: "NEW" },
      { status: "MATCHED" },
      { status: "CONFLICT" },
      { status: "ERROR" },
      { status: "SKIPPED" },
    ]),
    {
      newRows: 1,
      matchedRows: 1,
      conflictRows: 1,
      skippedRows: 2,
    },
  );
});

test("bulk row selectors ignore blocked rows and respect intent", () => {
  assert.deepEqual(
    selectRowsForBulkOperation([...stagedRows], "set_matched_update").map((row) => row.id),
    ["matched"],
  );
  assert.deepEqual(
    selectRowsForBulkOperation([...stagedRows], "set_unmatched_create").map((row) => row.id),
    ["new"],
  );
  assert.deepEqual(
    selectRowsForBulkOperation([...stagedRows], "skip_ready").map((row) => row.id),
    ["matched", "new"],
  );
});

test("bulk undo snapshots restore only the last saved staged row state", () => {
  const snapshot = buildImportBulkUndoSnapshot("skip_ready", [...stagedRows]);
  const restored = restoreRowsFromBulkUndo(snapshot);

  assert.equal(snapshot.updatedRows, 3);
  assert.equal(restored.length, 3);
  assert.deepEqual(restored.map((row) => row.id), ["matched", "new", "blocked"]);
});

test("import review action helpers protect blocked rows from editable resolution state", () => {
  assert.equal(canEditImportResolution(ImportRowStatus.NEW), true);
  assert.equal(canEditImportResolution(ImportRowStatus.MATCHED), true);
  assert.equal(canEditImportResolution(ImportRowStatus.ERROR), false);
  assert.equal(canEditImportResolution(ImportRowStatus.CONFLICT), false);
  assert.equal(canEditImportResolution(ImportRowStatus.APPLIED), false);
});

test("import row filter counts reflect the current review model", () => {
  const rows = [
    { status: ImportRowStatus.NEW },
    { status: ImportRowStatus.MATCHED },
    { status: ImportRowStatus.ERROR },
    { status: ImportRowStatus.SKIPPED },
  ];

  assert.equal(countImportRowsByFilter("all", rows), 4);
  assert.equal(countImportRowsByFilter("ready", rows), 2);
  assert.equal(countImportRowsByFilter("blocked", rows), 1);
  assert.equal(countImportRowsByFilter("skipped", rows), 1);
});

test("correction review records restage source data instead of rolling back inventory", () => {
  const records = buildCorrectionReviewRecords([
    {
      data: {
        name: "Bambu Lab A1 Mini",
        buildVolumeX: 180,
        location: null,
      },
    },
  ]);

  assert.deepEqual(records, [
    {
      name: "Bambu Lab A1 Mini",
      buildVolumeX: "180",
      location: "",
    },
  ]);
});

test("resolution labels stay product-oriented", () => {
  assert.equal(resolutionLabel("CREATE_NEW"), "Create as new item");
  assert.equal(resolutionLabel("UPDATE_MATCH"), "Update matched item");
  assert.equal(resolutionLabel("SKIP"), "Keep staged for later");
});
