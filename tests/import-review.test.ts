import test from "node:test";
import assert from "node:assert/strict";
import { buildImportRowReview } from "../lib/import-review";

test("matched filament rows explain likely duplicates in product language", () => {
  const review = buildImportRowReview({
    entityType: "FILAMENT",
    status: "MATCHED",
    resolution: "UPDATE_MATCH",
    suggestedMatchSlug: "bambu-lab-white-pla",
    validationErrors: [],
    data: {
      brand: "Bambu Lab",
      materialType: "PLA",
      color: "White",
      quantity: 1,
      estimatedRemainingGrams: 1000,
    },
    currentRecord: {
      brand: "Bambu Lab",
      materialType: "PLA",
      color: "White",
      quantity: 1,
      estimatedRemainingGrams: 1000,
    },
  });

  assert.equal(review.severity, "warning");
  assert.equal(review.title, "Likely duplicate");
  assert.match(review.reasons.join(" "), /same brand, material, and color/i);
  assert.equal(review.diffFields.length, 0);
});

test("matched printer rows surface changed fields as an update review", () => {
  const review = buildImportRowReview({
    entityType: "PRINTER",
    status: "MATCHED",
    resolution: "UPDATE_MATCH",
    suggestedMatchSlug: "bambu-lab-a1-mini",
    validationErrors: [],
    data: {
      name: "Bambu Lab A1 Mini",
      brand: "Bambu Lab",
      model: "A1 Mini",
      buildVolumeX: 180,
      buildVolumeY: 180,
      buildVolumeZ: 200,
      location: "Bench B",
      status: "ACTIVE",
    },
    currentRecord: {
      name: "Bambu Lab A1 Mini",
      brand: "Bambu Lab",
      model: "A1 Mini",
      buildVolumeX: 180,
      buildVolumeY: 180,
      buildVolumeZ: 180,
      location: "Bench A",
      status: "ACTIVE",
    },
  });

  assert.equal(review.severity, "warning");
  assert.equal(review.title, "Review before update");
  assert.equal(review.currentLabel, "Bambu Lab A1 Mini");
  assert.deepEqual(
    review.diffFields.map((field) => field.key).sort(),
    ["buildVolumeZ", "location"],
  );
});

test("blocked rows stay blockers with clear detail", () => {
  const review = buildImportRowReview({
    entityType: "BUILD_PLATE",
    status: "ERROR",
    resolution: "CREATE_NEW",
    suggestedMatchSlug: null,
    validationErrors: ["sizeMm must be greater than 0"],
    data: {
      name: "Bad plate",
      sizeMm: 0,
      surfaceType: "Smooth",
    },
    currentRecord: null,
  });

  assert.equal(review.severity, "blocker");
  assert.equal(review.title, "Blocked from apply");
  assert.match(review.detail, /sizeMm must be greater than 0/i);
});

test("new rows are classified as safe creates", () => {
  const review = buildImportRowReview({
    entityType: "HOTEND",
    status: "NEW",
    resolution: "CREATE_NEW",
    suggestedMatchSlug: null,
    validationErrors: [],
    data: {
      name: "P2S 0.6 mm Hardened Steel",
      nozzleSize: 0.6,
      materialType: "Hardened Steel",
      quantity: 1,
    },
    currentRecord: null,
  });

  assert.equal(review.severity, "safe");
  assert.equal(review.title, "Ready to create");
  assert.match(review.reasons[0], /no existing hotends matched/i);
});
