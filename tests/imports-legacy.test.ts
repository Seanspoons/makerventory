import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "../app/api/import-templates/[entity]/route";
import { importFieldConfigs, parseInventoryNotes } from "../lib/imports";

test("import field configs do not expose removed legacy fields", () => {
  assert.deepEqual(
    importFieldConfigs.BUILD_PLATE.map((field) => field.key),
    ["name", "sizeMm", "surfaceType", "status", "notes"],
  );
  assert.deepEqual(
    importFieldConfigs.HOTEND.map((field) => field.key),
    ["name", "nozzleSize", "materialType", "quantity", "status"],
  );
  assert.deepEqual(
    importFieldConfigs.CONSUMABLE.map((field) => field.key),
    ["name", "category", "quantity", "unit", "reorderThreshold", "storageLocation"],
  );
});

test("notes parsing no longer emits sizeLabel or hotend manual usage fields", () => {
  const groups = parseInventoryNotes(`
3D Printing Setup

Build Plates
Bambu Lab Textured Build Plate 180mm

Hotends
A1 Mini 0.4mm Hardened Steel (In Use)
`);

  const buildPlateRecord = groups.find((group) => group.entityType === "BUILD_PLATE")?.records[0];
  const hotendRecord = groups.find((group) => group.entityType === "HOTEND")?.records[0];

  assert.deepEqual(buildPlateRecord, {
    name: "Bambu Lab Textured Build Plate 180mm",
    sizeMm: "180",
    surfaceType: "Textured",
    status: "AVAILABLE",
    notes: "",
  });
  assert.equal("sizeLabel" in (buildPlateRecord ?? {}), false);
  assert.equal("inUseCount" in (hotendRecord ?? {}), false);
  assert.equal("spareCount" in (hotendRecord ?? {}), false);
});

test("CSV templates no longer publish removed legacy columns", async () => {
  const buildPlateResponse = await GET(new Request("http://localhost"), {
    params: Promise.resolve({ entity: "build_plate" }),
  });
  const hotendResponse = await GET(new Request("http://localhost"), {
    params: Promise.resolve({ entity: "hotend" }),
  });
  const consumableResponse = await GET(new Request("http://localhost"), {
    params: Promise.resolve({ entity: "consumable" }),
  });

  const [buildPlateCsv, hotendCsv, consumableCsv] = await Promise.all([
    buildPlateResponse.text(),
    hotendResponse.text(),
    consumableResponse.text(),
  ]);

  assert.match(buildPlateCsv, /^name,sizeMm,surfaceType,status,notes/m);
  assert.doesNotMatch(buildPlateCsv, /sizeLabel/);
  assert.match(hotendCsv, /^name,nozzleSize,materialType,quantity,status,notes/m);
  assert.doesNotMatch(hotendCsv, /inUseCount|spareCount/);
  assert.match(consumableCsv, /^name,category,quantity,unit,reorderThreshold,storageLocation,notes/m);
  assert.doesNotMatch(consumableCsv, /,status,/);
});
