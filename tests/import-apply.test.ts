import test from "node:test";
import assert from "node:assert/strict";
import { ImportJobStatus, ImportRowStatus } from "@prisma/client";
import { applyImportJobRows } from "../lib/imports";
import { prisma } from "../lib/prisma";

test("applyImportJobRows applies actionable rows with a batched transaction payload", async () => {
  const originalImportJobFindFirst = prisma.importJob.findFirst;
  const originalImportJobUpdate = prisma.importJob.update;
  const originalImportRowUpdate = prisma.importRow.update;
  const originalPrinterCreate = prisma.printer.create;
  const originalTransaction = prisma.$transaction.bind(prisma);

  const calls: string[] = [];

  try {
    prisma.importJob.findFirst = (async () =>
      ({
        id: "job-1",
        workspaceId: "workspace-1",
        entityType: "PRINTER",
        status: ImportJobStatus.STAGED,
        rows: [
          {
            id: "row-create",
            rowIndex: 1,
            status: ImportRowStatus.NEW,
            resolution: "CREATE_NEW",
            resolvedMatchId: null,
            data: {
              name: "Bambu Lab A1 Mini",
              brand: "Bambu Lab",
              model: "A1 Mini",
              buildVolumeX: 180,
              buildVolumeY: 180,
              buildVolumeZ: 180,
            },
          },
          {
            id: "row-skip",
            rowIndex: 2,
            status: ImportRowStatus.SKIPPED,
            resolution: "SKIP",
            resolvedMatchId: null,
            data: {},
          },
          {
            id: "row-blocked",
            rowIndex: 3,
            status: ImportRowStatus.ERROR,
            resolution: "CREATE_NEW",
            resolvedMatchId: null,
            data: {},
          },
        ],
      })) as typeof prisma.importJob.findFirst;

    prisma.printer.create = ((args: unknown) => {
      calls.push("printer.create");
      return Promise.resolve(args) as never;
    }) as typeof prisma.printer.create;

    prisma.importRow.update = ((args: { where: { id: string } }) => {
      calls.push(`importRow.update:${args.where.id}`);
      return Promise.resolve(args) as never;
    }) as typeof prisma.importRow.update;

    prisma.importJob.update = ((args: { where: { id: string } }) => {
      calls.push(`importJob.update:${args.where.id}`);
      return Promise.resolve({
        id: args.where.id,
        entityType: "PRINTER",
        sourceName: "Import",
        appliedAt: new Date("2026-03-23T00:00:00.000Z"),
      }) as never;
    }) as typeof prisma.importJob.update;

    prisma.$transaction = (async (arg: unknown) => {
      assert.ok(Array.isArray(arg), "expected batched transaction operations");
      return Promise.all(arg as Promise<unknown>[]);
    }) as typeof prisma.$transaction;

    const job = await applyImportJobRows("job-1", "workspace-1");

    assert.equal(job.id, "job-1");
    assert.deepEqual(calls, [
      "printer.create",
      "importRow.update:row-create",
      "importJob.update:job-1",
    ]);
  } finally {
    prisma.importJob.findFirst = originalImportJobFindFirst;
    prisma.importJob.update = originalImportJobUpdate;
    prisma.importRow.update = originalImportRowUpdate;
    prisma.printer.create = originalPrinterCreate;
    prisma.$transaction = originalTransaction as typeof prisma.$transaction;
  }
});
