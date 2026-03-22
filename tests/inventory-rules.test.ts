import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveBuildPlateStatus,
  deriveHotendInstalledCount,
  deriveHotendSpareCount,
  deriveHotendStatus,
} from "../lib/inventory-rules";
import { deriveConsumableStatus } from "../lib/utils";

test("deriveHotendStatus uses assignment as the source of truth", () => {
  assert.equal(
    deriveHotendStatus({ quantity: 3, installedPrinterId: "printer-1", persistedStatus: "AVAILABLE" }),
    "IN_USE",
  );
  assert.equal(deriveHotendInstalledCount("printer-1"), 1);
  assert.equal(deriveHotendSpareCount(3, "printer-1"), 2);
});

test("deriveHotendStatus preserves retired hotends and low stock behavior", () => {
  assert.equal(
    deriveHotendStatus({ quantity: 5, installedPrinterId: null, persistedStatus: "RETIRED" }),
    "RETIRED",
  );
  assert.equal(
    deriveHotendStatus({ quantity: 1, installedPrinterId: null, persistedStatus: "AVAILABLE" }),
    "LOW_STOCK",
  );
  assert.equal(
    deriveHotendStatus({ quantity: 4, installedPrinterId: null, persistedStatus: "AVAILABLE" }),
    "AVAILABLE",
  );
});

test("deriveBuildPlateStatus follows assignment and preserves worn or retired plates", () => {
  assert.equal(
    deriveBuildPlateStatus({ installedPrinterId: "printer-1", persistedStatus: "AVAILABLE" }),
    "IN_USE",
  );
  assert.equal(
    deriveBuildPlateStatus({ installedPrinterId: null, persistedStatus: "WORN" }),
    "WORN",
  );
  assert.equal(
    deriveBuildPlateStatus({ installedPrinterId: null, persistedStatus: "RETIRED" }),
    "RETIRED",
  );
});

test("deriveConsumableStatus reflects quantity and reorder threshold rules", () => {
  assert.equal(deriveConsumableStatus(0, 2), "OUT");
  assert.equal(deriveConsumableStatus(2.5, 2), "LOW");
  assert.equal(deriveConsumableStatus(10, 2), "HEALTHY");
});
