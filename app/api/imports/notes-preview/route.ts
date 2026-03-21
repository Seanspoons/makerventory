import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseInventoryNotes, stageImportRecords } from "@/lib/imports";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { notesText?: string };
  const notesText = body.notesText?.trim();

  if (!notesText) {
    return NextResponse.json({ error: "Notes text is required." }, { status: 400 });
  }

  const groups = parseInventoryNotes(notesText);
  if (groups.length === 0) {
    return NextResponse.json({ groups: [] }, { status: 200 });
  }

  const previewGroups = await Promise.all(
    groups.map(async (group) => {
      const rows = await stageImportRecords(session.user.workspaceId, group.entityType, group.records);
      return {
        entityType: group.entityType,
        sourceName: group.sourceName,
        totalRows: rows.length,
        readyRows: rows.filter((row) => row.status === "NEW" || row.status === "MATCHED").length,
        blockedRows: rows.filter(
          (row) => row.status === "CONFLICT" || row.status === "ERROR" || row.status === "SKIPPED",
        ).length,
        rows: rows.map((row) => ({
          rowIndex: row.rowIndex,
          status: row.status,
          resolution: row.resolution,
          suggestedMatchSlug: row.suggestedMatchSlug ?? null,
          validationErrors: row.validationErrors,
          data: row.data,
        })),
      };
    }),
  );

  return NextResponse.json({ groups: previewGroups }, { status: 200 });
}
