import test from "node:test";
import assert from "node:assert/strict";
import { summarizeAuditMetadata } from "../lib/audit-presenters";
import { formatEntityName } from "../lib/utils";

test("audit metadata summaries use product-language notes for import recovery", () => {
  const notes = summarizeAuditMetadata({
    updatedRows: 4,
    sourceImportJobId: "job_123",
    previousRows: [{ id: "row_1" }],
  });

  assert.deepEqual(notes, [
    "4 rows changed",
    "Created from an earlier import job.",
    "Previous row decisions were captured for recovery.",
  ]);
});

test("formatEntityName keeps import and inventory labels user-facing", () => {
  assert.equal(formatEntityName("SMART_PLUG"), "Smart Plugs");
  assert.equal(formatEntityName("import-job"), "Import Job");
  assert.equal(formatEntityName("BUILD_PLATE"), "Build Plates");
});
