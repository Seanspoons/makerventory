import Link from "next/link";
import { ImportRowResolution, ImportRowStatus } from "@prisma/client";
import { format } from "date-fns";
import {
  applyStagedImport,
  stageImportJob,
  stageInventoryNotesImport,
  updateImportRowDecision,
  updateImportRowResolution,
} from "@/app/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { ConfirmActionForm } from "@/components/inventory/confirm-action-form";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getImportJobs } from "@/lib/data";
import { importEntityOptions, importFieldConfigs } from "@/lib/imports";
import { cn, titleCase } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function rowTone(status: ImportRowStatus) {
  if (status === ImportRowStatus.ERROR || status === ImportRowStatus.CONFLICT) {
    return "bg-rose-50/70";
  }

  if (status === ImportRowStatus.MATCHED) {
    return "bg-amber-50/70";
  }

  if (status === ImportRowStatus.APPLIED) {
    return "bg-emerald-50/70";
  }

  return "bg-white";
}

function canRetryRow(status: ImportRowStatus) {
  return status === ImportRowStatus.SKIPPED;
}

function canSkipRow(status: ImportRowStatus) {
  return status === ImportRowStatus.NEW || status === ImportRowStatus.MATCHED;
}

function resolutionLabel(resolution: ImportRowResolution) {
  if (resolution === ImportRowResolution.UPDATE_MATCH) return "Update match";
  if (resolution === ImportRowResolution.SKIP) return "Skip";
  return "Create new";
}

export default async function ImportsPage(props: { searchParams?: SearchParams }) {
  const searchParams = (await props.searchParams) ?? {};
  const selected =
    typeof searchParams.selected === "string" ? searchParams.selected : null;
  const entityTypeParam =
    typeof searchParams.entityType === "string" ? searchParams.entityType : "FILAMENT";
  const selectedEntityType = importEntityOptions.some((option) => option.value === entityTypeParam)
    ? entityTypeParam
    : "FILAMENT";
  const { jobs, selectedJob } = await getImportJobs(selected);
  const actionableRows =
    selectedJob?.rows.filter(
      (row) => row.status === ImportRowStatus.NEW || row.status === ImportRowStatus.MATCHED,
    ) ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Imports"
        description="Stage real workshop data into a review queue before it touches inventory. Imports are workspace-scoped, row-level validated, and applied only after explicit confirmation."
        action={
          <div className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            {jobs.length} recent import job{jobs.length === 1 ? "" : "s"}
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <SectionCard
          title="Stage CSV import"
          description="Upload a focused CSV, review the staged rows, and apply changes deliberately so your workshop data stays clean and organized."
        >
          <div className="mb-5 flex flex-wrap gap-2">
            {importEntityOptions.map((option) => (
              <Button key={option.value} asChild variant="secondary" size="sm">
                <Link href={`/api/import-templates/${option.value.toLowerCase()}`}>
                  Download {option.label} template
                </Link>
              </Button>
            ))}
          </div>
          <form action={stageImportJob} className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-500">Entity type</label>
              <Select name="entityType" defaultValue={selectedEntityType} required>
                {importEntityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-500">Source label</label>
              <Input
                name="sourceName"
                placeholder="Shop stocktake March 2026"
                maxLength={80}
              />
            </div>
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm text-slate-500">CSV file</label>
              <Input name="file" type="file" accept=".csv,text/csv" required />
            </div>
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm text-slate-500">Import notes</label>
              <Textarea
                name="notes"
                placeholder="Record where this export came from, what was cleaned, and any assumptions before apply."
              />
            </div>
            <div className="lg:col-span-2 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-950">Column mapping</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Override source column names when your CSV headers do not exactly match the template.
                  </p>
                </div>
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/imports?entityType=${selectedEntityType}`}>Refresh field list</Link>
                </Button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {importFieldConfigs[selectedEntityType as keyof typeof importFieldConfigs].map((field) => (
                  <div key={field.key}>
                    <label className="mb-2 block text-sm text-slate-500">
                      {field.label}
                      {field.required ? " *" : ""}
                    </label>
                    <Input
                      name={`mapping:${field.key}`}
                      placeholder={field.key}
                      defaultValue={field.key}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 grid gap-3 md:grid-cols-2">
              {importEntityOptions.map((option) => (
                <div
                  key={option.value}
                  className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4"
                >
                  <p className="font-medium text-slate-950">{option.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {option.description}
                  </p>
                </div>
              ))}
            </div>
            <div className="lg:col-span-2">
              <SubmitButton>Stage import</SubmitButton>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Paste inventory notes"
          description="Paste Apple Notes or similar text exports and stage multiple inventory jobs from one structured note."
        >
          <form action={stageInventoryNotesImport} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-500">Source label</label>
              <Input
                name="sourceName"
                placeholder="Apple Notes workshop inventory"
                maxLength={80}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-500">Pasted notes</label>
              <Textarea
                name="notesText"
                placeholder="Paste your structured workshop notes here"
                className="min-h-[280px]"
                required
              />
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-600">
              <p className="font-medium text-slate-950">Supported headings</p>
              <p className="mt-2">
                Printers, Automatic Material System (AMS) / Dryers, Build Plates, Hotends, Filament, Consumables &amp; Maintenance, Safety &amp; Air Quality, Extra Structural Printer Components, Smart Plugs, Related Tools and Parts, and Items to Buy.
              </p>
            </div>
            <SubmitButton>Stage notes import</SubmitButton>
          </form>
        </SectionCard>
      </div>

      <SectionCard
        title="Review checklist"
        description="Treat staged imports as a controlled change set. Resolve conflicts before apply and keep notes about how the source data was normalized."
      >
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4">
            <p className="font-medium text-slate-950">Before apply</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Confirm matched rows are true updates, not accidental collisions from overly broad names.
            </p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-4">
            <p className="font-medium text-slate-950">Conflicts</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Rows marked <span className="font-medium text-rose-700">Conflict</span> or <span className="font-medium text-rose-700">Error</span> will not apply. Clean the source and re-stage.
            </p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-4">
            <p className="font-medium text-slate-950">Notes paste path</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              One pasted note can stage multiple jobs, grouped by section, so you can review each inventory domain separately.
            </p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-4">
            <p className="font-medium text-slate-950">Per-row control</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Skip rows you do not want applied yet, then re-queue or switch them to create-vs-update without re-uploading everything.
            </p>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <SectionCard
          title="Recent import jobs"
          description="Open a staged job to inspect row-level validation, suggested matches, and apply readiness."
        >
          <div className="space-y-3">
            {jobs.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-500">
                No import jobs yet. Stage a CSV above to begin onboarding real data.
              </div>
            ) : null}

            {jobs.map((job) => {
              const isSelected = selectedJob?.id === job.id;
              return (
                <Link
                  key={job.id}
                  href={`/imports?selected=${job.id}`}
                  className={cn(
                    "block rounded-[24px] border p-4 transition",
                    isSelected
                      ? "border-slate-900 bg-slate-950 text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={cn("font-medium", isSelected ? "text-white" : "text-slate-950")}>
                        {job.sourceName}
                      </p>
                      <p className={cn("mt-1 text-sm", isSelected ? "text-white/75" : "text-slate-500")}>
                        {titleCase(job.entityType)} · {job.originalFilename}
                      </p>
                    </div>
                    <StatusBadge value={job.status} />
                  </div>
                  <div className={cn("mt-3 grid grid-cols-4 gap-2 text-xs", isSelected ? "text-white/80" : "text-slate-500")}>
                    <div>
                      <p className="font-medium">{job.totalRows}</p>
                      <p>Total</p>
                    </div>
                    <div>
                      <p className="font-medium">{job.newRows}</p>
                      <p>New</p>
                    </div>
                    <div>
                      <p className="font-medium">{job.matchedRows}</p>
                      <p>Matched</p>
                    </div>
                    <div>
                      <p className="font-medium">{job.conflictRows + job.skippedRows}</p>
                      <p>Blocked</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title={selectedJob ? `Staged job: ${selectedJob.sourceName}` : "Staged job detail"}
          description={
            selectedJob
              ? `${selectedJob.totalRows} rows staged on ${format(selectedJob.createdAt, "MMM d, yyyy 'at' h:mm a")} by ${selectedJob.createdByUser.name ?? selectedJob.createdByUser.email}.`
              : "Select an import job to inspect staged rows."
          }
        >
          {selectedJob ? (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">New</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{selectedJob.newRows}</p>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Matched</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{selectedJob.matchedRows}</p>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Blocked</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {selectedJob.conflictRows + selectedJob.skippedRows}
                  </p>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Ready</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {actionableRows.length}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                <div className="text-sm text-slate-600">
                  <p className="font-medium text-slate-950">
                    {titleCase(selectedJob.entityType)} import
                  </p>
                  <p className="mt-1">
                    {selectedJob.notes ?? "No operator notes were recorded for this job."}
                  </p>
                  {selectedJob.fieldMapping ? (
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Custom column mapping saved for this import job.
                    </p>
                  ) : null}
                </div>
                {selectedJob.status === "STAGED" ? (
                  <ConfirmActionForm
                    action={applyStagedImport}
                    title="Apply staged import"
                    description="This writes staged rows into your workspace inventory. Blocked rows will remain staged and unapplied."
                    confirmLabel="Apply import"
                    triggerLabel="Apply staged rows"
                    triggerVariant="secondary"
                  >
                    <input type="hidden" name="jobId" value={selectedJob.id} />
                    <div className="rounded-[18px] bg-slate-50 p-3 text-sm text-slate-600">
                      {actionableRows.length} row(s) are eligible to apply.
                    </div>
                  </ConfirmActionForm>
                ) : (
                  <Button type="button" variant="secondary" disabled>
                    Import applied
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Row</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Apply as</th>
                      <th className="px-4 py-3 font-medium">Suggested match</th>
                      <th className="px-4 py-3 font-medium">Validation</th>
                      <th className="px-4 py-3 font-medium">Payload</th>
                      <th className="px-4 py-3 font-medium">Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {selectedJob.rows.map((row) => (
                      <tr key={row.id} className={cn("align-top", rowTone(row.status))}>
                        <td className="px-4 py-4 font-medium text-slate-950">{row.rowIndex}</td>
                        <td className="px-4 py-4">
                          <StatusBadge value={row.status} />
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {selectedJob.status === "STAGED" && row.status !== ImportRowStatus.APPLIED ? (
                            <form action={updateImportRowResolution} className="space-y-2">
                              <input type="hidden" name="rowId" value={row.id} />
                              <Select name="resolution" defaultValue={row.resolution}>
                                <option value="CREATE_NEW">Create new</option>
                                <option value="UPDATE_MATCH" disabled={!row.suggestedMatchId}>
                                  Update suggested match
                                </option>
                                <option value="SKIP">Skip</option>
                              </Select>
                              <SubmitButton variant="secondary" size="sm">
                                Save
                              </SubmitButton>
                            </form>
                          ) : (
                            resolutionLabel(row.resolution)
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {row.resolvedMatchSlug ?? row.suggestedMatchSlug ?? "New record"}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {row.validationErrors.length > 0 ? (
                            <div className="space-y-1">
                              {row.validationErrors.map((error) => (
                                <p key={error}>{error}</p>
                              ))}
                            </div>
                          ) : (
                            "No validation issues"
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <pre className="max-w-[480px] overflow-x-auto whitespace-pre-wrap rounded-[18px] bg-slate-950 p-3 text-xs leading-6 text-slate-100">
                            {JSON.stringify(row.data, null, 2)}
                          </pre>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-2">
                            {canSkipRow(row.status) ? (
                              <form action={updateImportRowDecision}>
                                <input type="hidden" name="rowId" value={row.id} />
                                <input type="hidden" name="decision" value="skip" />
                                <SubmitButton variant="secondary" size="sm">
                                  Skip row
                                </SubmitButton>
                              </form>
                            ) : null}
                            {canRetryRow(row.status) ? (
                              <form action={updateImportRowDecision}>
                                <input type="hidden" name="rowId" value={row.id} />
                                <input type="hidden" name="decision" value="retry" />
                                <SubmitButton variant="secondary" size="sm">
                                  Re-queue row
                                </SubmitButton>
                              </form>
                            ) : null}
                            {row.status === ImportRowStatus.CONFLICT ? (
                              <p className="text-xs leading-5 text-slate-500">
                                Fix the source CSV and stage a new import to resolve conflicts.
                              </p>
                            ) : null}
                            {row.status === ImportRowStatus.ERROR ? (
                              <p className="text-xs leading-5 text-slate-500">
                                This row is blocked by validation errors and cannot be re-queued until corrected upstream.
                              </p>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-500">
              No staged job selected.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
