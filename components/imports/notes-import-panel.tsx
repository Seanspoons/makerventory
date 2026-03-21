"use client";

import { useState, useTransition } from "react";
import type { ImportEntityType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatEntityName } from "@/lib/utils";

type PreviewRow = {
  rowIndex: number;
  status: string;
  resolution: string;
  suggestedMatchSlug: string | null;
  validationErrors: string[];
  data: Record<string, unknown>;
};

type PreviewGroup = {
  groupKey: string;
  entityType?: ImportEntityType | null;
  sectionLabel: string;
  sourceName: string;
  totalRows: number;
  readyRows: number;
  blockedRows: number;
  rows: PreviewRow[];
};

export function NotesImportPanel({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const [notesText, setNotesText] = useState("");
  const [sourceName, setSourceName] = useState("Apple Notes workshop inventory");
  const [preview, setPreview] = useState<PreviewGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Record<string, boolean>>({});
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewPending, startPreviewTransition] = useTransition();

  async function handlePreview() {
    setPreviewError(null);
    startPreviewTransition(async () => {
      const response = await fetch("/api/imports/notes-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notesText }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setPreview([]);
        setPreviewError(payload?.error ?? "Preview failed.");
        return;
      }

      const payload = (await response.json()) as { groups: PreviewGroup[] };
      setPreview(payload.groups);
      setSelectedGroups(
        Object.fromEntries(payload.groups.map((group) => [group.groupKey, true])),
      );
      if (payload.groups.length === 0) {
        setPreviewError("No supported inventory sections were detected in the pasted notes.");
      }
    });
  }

  const selectedCount = preview.filter((group) => selectedGroups[group.groupKey]).length;

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm text-slate-500">Source label</label>
          <Input
            name="sourceName"
            value={sourceName}
            onChange={(event) => setSourceName(event.target.value)}
            placeholder="Apple Notes workshop inventory"
            maxLength={80}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-slate-500">Pasted notes</label>
          <Textarea
            name="notesText"
            value={notesText}
            onChange={(event) => setNotesText(event.target.value)}
            placeholder="Paste your structured workshop notes here"
            className="min-h-[280px]"
            required
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="secondary" onClick={handlePreview} disabled={isPreviewPending || !notesText.trim()}>
            {isPreviewPending ? "Previewing..." : "Preview parsed sections"}
          </Button>
          <Button type="submit" disabled={!notesText.trim()}>
            Stage notes import
          </Button>
        </div>
        {preview.map((group) =>
          selectedGroups[group.groupKey] ? (
            <input key={group.groupKey} type="hidden" name="selectedGroupKey" value={group.groupKey} />
          ) : null,
        )}
      </form>

      <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-600">
        <p className="font-medium text-slate-950">Supported headings</p>
        <p className="mt-2">
          Printers, Automatic Material System (AMS) / Dryers, Build Plates, Hotends, Filament, Consumables &amp; Maintenance, Safety &amp; Air Quality, Extra Structural Printer Components, Smart Plugs, Related Tools and Parts, and Items to Buy.
        </p>
      </div>

      {previewError ? (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {previewError}
        </div>
      ) : null}

      {preview.length > 0 ? (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4">
            <p className="font-medium text-slate-950">Preview summary</p>
            <p className="mt-2 text-sm text-slate-600">
              {preview.length} import group{preview.length === 1 ? "" : "s"} detected from the pasted notes.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {selectedCount} selected for staging.
            </p>
          </div>

          {preview.map((group) => {
            const entityLabel = formatEntityName(group.entityType ?? undefined);

            return (
              <div key={group.sourceName} className="rounded-[24px] border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <label className="mt-1 flex items-center">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedGroups[group.groupKey])}
                        onChange={(event) =>
                          setSelectedGroups((current) => ({
                            ...current,
                            [group.groupKey]: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </label>
                    <div>
                      <p className="font-medium text-slate-950">{group.sectionLabel}</p>
                      <p className="mt-1 text-sm text-slate-500">{entityLabel}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={group.readyRows > 0 ? "NEW" : "SKIPPED"} />
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {group.totalRows} rows
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Ready</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">{group.readyRows}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Blocked</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">{group.blockedRows}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Type</p>
                    <p className="mt-2 text-sm font-medium text-slate-950">{entityLabel}</p>
                  </div>
                </div>

                <details className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50/70">
                  <summary className="cursor-pointer list-none px-4 py-3 font-medium text-slate-950">
                    Preview parsed rows
                  </summary>
                  <div className="space-y-3 border-t border-slate-200 p-4">
                    {group.rows.slice(0, 4).map((row) => (
                      <div
                        key={`${group.groupKey}-${row.rowIndex}`}
                        className={cn(
                          "rounded-2xl border p-3",
                          row.status === "ERROR" || row.status === "CONFLICT"
                            ? "border-rose-200 bg-rose-50/70"
                            : "border-slate-200 bg-white",
                        )}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium text-slate-950">Row {row.rowIndex}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {row.suggestedMatchSlug
                                ? `Suggested match: ${row.suggestedMatchSlug}`
                                : "New record candidate"}
                            </p>
                          </div>
                          <StatusBadge value={row.status} />
                        </div>
                        {row.validationErrors.length > 0 ? (
                          <div className="mt-3 text-sm text-rose-800">
                            {row.validationErrors.join(" · ")}
                          </div>
                        ) : null}
                        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-[18px] bg-slate-950 p-3 text-xs leading-6 text-slate-100">
                          {JSON.stringify(row.data, null, 2)}
                        </pre>
                      </div>
                    ))}
                    {group.rows.length > 4 ? (
                      <p className="text-sm text-slate-500">
                        Showing 4 of {group.rows.length} rows in preview. Full control is available after staging.
                      </p>
                    ) : null}
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
