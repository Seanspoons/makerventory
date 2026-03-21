import Link from "next/link";
import type { ImportRowResolution } from "@prisma/client";
import { ImportRowStatus } from "@prisma/client";
import { format } from "date-fns";
import {
  applyAllStagedImports,
  applyStagedImport,
  stageImportJob,
  stageInventoryNotesImport,
  updateImportJobRowsBulk,
  updateImportRowDecision,
  updateImportRowResolution,
} from "@/app/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { NotesImportPanel } from "@/components/imports/notes-import-panel";
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

const rowStatusFilters = [
  { value: "all", label: "All rows" },
  { value: "ready", label: "Ready" },
  { value: "matched", label: "Matched" },
  { value: "new", label: "New" },
  { value: "blocked", label: "Blocked" },
  { value: "skipped", label: "Skipped" },
  { value: "applied", label: "Applied" },
] as const;

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
  if (resolution === "UPDATE_MATCH") return "Update match";
  if (resolution === "SKIP") return "Skip";
  return "Create new";
}

export default async function ImportsPage(props: { searchParams?: SearchParams }) {
  const searchParams = (await props.searchParams) ?? {};
  const selected =
    typeof searchParams.selected === "string" ? searchParams.selected : null;
  const rowStatusParam =
    typeof searchParams.rowStatus === "string" ? searchParams.rowStatus : "all";
  const entityTypeParam =
    typeof searchParams.entityType === "string" ? searchParams.entityType : "FILAMENT";
  const selectedEntityType = importEntityOptions.some((option) => option.value === entityTypeParam)
    ? entityTypeParam
    : "FILAMENT";
  const { jobs, selectedJob } = await getImportJobs(selected);
  const selectedRowFilter = rowStatusFilters.some((filter) => filter.value === rowStatusParam)
    ? rowStatusParam
    : "all";
  const selectedJobHref = selectedJob
    ? `/imports?selected=${selectedJob.id}&rowStatus=${selectedRowFilter}#staged-job`
    : "/imports#staged-job";
  const stagedJobs = jobs.filter((job) => job.status === "STAGED");
  const actionableRows =
    selectedJob?.rows.filter(
      (row) => row.status === ImportRowStatus.NEW || row.status === ImportRowStatus.MATCHED,
    ) ?? [];
  const blockedRows =
    selectedJob?.rows.filter(
      (row) => row.status === ImportRowStatus.CONFLICT || row.status === ImportRowStatus.ERROR,
    ) ?? [];
  const skippedRows =
    selectedJob?.rows.filter((row) => row.status === ImportRowStatus.SKIPPED) ?? [];
  const appliedJobCount = jobs.filter((job) => job.status === "APPLIED").length;
  const filteredRows =
    selectedJob?.rows.filter((row) => {
      if (selectedRowFilter === "all") return true;
      if (selectedRowFilter === "ready") {
        return row.status === ImportRowStatus.NEW || row.status === ImportRowStatus.MATCHED;
      }
      if (selectedRowFilter === "matched") return row.status === ImportRowStatus.MATCHED;
      if (selectedRowFilter === "new") return row.status === ImportRowStatus.NEW;
      if (selectedRowFilter === "blocked") {
        return row.status === ImportRowStatus.CONFLICT || row.status === ImportRowStatus.ERROR;
      }
      if (selectedRowFilter === "skipped") return row.status === ImportRowStatus.SKIPPED;
      if (selectedRowFilter === "applied") return row.status === ImportRowStatus.APPLIED;
      return true;
    }) ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Imports"
        description="Stage real workshop data into a review queue before it touches inventory. Imports are workspace-scoped, row-level validated, and applied only after explicit confirmation."
        action={
          <div className="w-full rounded-[22px] border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:w-auto">
            {stagedJobs.length > 0
              ? `${stagedJobs.length} staged job${stagedJobs.length === 1 ? "" : "s"} need review`
              : `${jobs.length} recent import job${jobs.length === 1 ? "" : "s"}`}
          </div>
        }
      />

      <SectionCard
        title="Import at a glance"
        description="Start with one import path, then review staged jobs once they are ready."
      >
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] border border-slate-900 bg-slate-950 p-5 text-white">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Recommended next step</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">
              {stagedJobs.length > 0 ? "Finish reviewing staged imports" : "Choose the format you already have"}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {stagedJobs.length > 0
                ? "Resolve blocked rows, confirm matched updates, and apply the ready rows once the change set looks clean."
                : "Use CSV when your data already has columns. Use Notes import when your inventory still lives in Apple Notes or structured text."}
            </p>
            <div className="mt-4">
              <Button asChild className="!text-white [&_svg]:!text-white">
                <Link href={stagedJobs.length > 0 ? "#staged-job" : "#notes-import"}>
                  {stagedJobs.length > 0 ? "Go to staged review" : "Start notes import"}
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-sm text-slate-500">Staged jobs</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{stagedJobs.length}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-sm text-slate-500">Applied jobs</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{appliedJobCount}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-sm text-slate-500">Ready rows in selection</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{actionableRows.length}</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Choose import method"
        description="Start with the path that matches the format you already have."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              CSV import
            </p>
            <p className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
              Use this if you already have structured columns
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Best for spreadsheets, exports, or cleaned inventory lists where each row already maps to a record.
            </p>
            <div className="mt-4">
              <Button asChild variant="secondary">
                <Link href="#csv-import">Go to CSV import</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-950 bg-slate-950 p-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
              Notes import
            </p>
            <p className="mt-3 text-xl font-semibold tracking-tight text-white">
              Use this if your inventory is sitting in Apple Notes or plain text
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Best for structured workshop notes with headings like printers, filament, consumables, smart plugs, and wishlist items.
            </p>
            <div className="mt-4">
              <Button asChild className="!text-white [&_svg]:!text-white">
                <Link href="#notes-import">Go to Notes import</Link>
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div id="csv-import">
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
        </div>

        <div id="notes-import">
          <SectionCard
            title="Paste inventory notes"
            description="Paste Apple Notes or similar text exports and stage multiple inventory jobs from one structured note."
          >
            <NotesImportPanel action={stageInventoryNotesImport} />
          </SectionCard>
        </div>
      </div>

      <details className="rounded-[28px] border border-slate-200 bg-white">
        <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-slate-950 sm:px-6">
          How import review works
        </summary>
        <div className="grid gap-4 border-t border-slate-100 p-5 lg:grid-cols-2 xl:grid-cols-4 sm:p-6">
          <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
            <p className="font-medium text-slate-950">Before apply</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Confirm matched rows are true updates, not accidental collisions from overly broad names.
            </p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
            <p className="font-medium text-slate-950">Conflicts</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Rows marked <span className="font-medium text-rose-700">Conflict</span> or <span className="font-medium text-rose-700">Error</span> will not apply. Clean the source and re-stage.
            </p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
            <p className="font-medium text-slate-950">Notes paste path</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              One pasted note can stage multiple jobs, grouped by section, so you can review each inventory domain separately.
            </p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
            <p className="font-medium text-slate-950">Per-row control</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Skip rows you do not want applied yet, then re-queue or switch them to create-vs-update without re-uploading everything.
            </p>
          </div>
        </div>
      </details>

      <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.95fr)_minmax(0,1.25fr)] xl:items-start">
        <SectionCard
          className="xl:sticky xl:top-6"
          title="Recent import jobs"
          description="Open a staged job to inspect row-level validation, suggested matches, and apply readiness."
        >
          {stagedJobs.length > 0 ? (
            <div className="mb-4 rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-sm text-slate-600">
                {stagedJobs.length} staged job{stagedJobs.length === 1 ? "" : "s"} ready for batch apply.
              </p>
              <div className="mt-3">
                <ConfirmActionForm
                  action={applyAllStagedImports}
                  title="Apply all staged imports"
                  description="This applies every staged import job in the current workspace. Blocked rows will remain staged and unapplied."
                  confirmLabel="Apply all staged jobs"
                  triggerLabel="Apply all staged jobs"
                  triggerVariant="secondary"
                >
                  <input type="hidden" name="returnTo" value="/imports#staged-job" />
                  <div className="rounded-[18px] bg-slate-50 p-3 text-sm text-slate-600">
                    {stagedJobs.length} staged job(s) will be applied in sequence.
                  </div>
                </ConfirmActionForm>
              </div>
            </div>
          ) : null}
          <div className="space-y-3 xl:max-h-[calc(100vh-14rem)] xl:overflow-y-auto xl:pr-2">
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
                  href={`/imports?selected=${job.id}&rowStatus=${selectedRowFilter}#staged-job`}
                  className={cn(
                    "block min-w-0 rounded-[24px] border p-4 transition",
                    isSelected
                      ? "border-slate-900 bg-slate-950 text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className={cn("break-words font-medium", isSelected ? "text-white" : "text-slate-950")}>
                        {job.sourceName}
                      </p>
                      <p className={cn("mt-1 break-words text-sm", isSelected ? "text-white/75" : "text-slate-500")}>
                        {titleCase(job.entityType)} · {job.originalFilename}
                      </p>
                    </div>
                    <StatusBadge value={job.status} />
                  </div>
                  <div className={cn("mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4", isSelected ? "text-white/80" : "text-slate-500")}>
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

        <div id="staged-job">
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
                  <div className="w-full sm:w-auto">
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                      <ConfirmActionForm
                        action={applyStagedImport}
                        title="Apply staged import"
                        description="This writes staged rows into your workspace inventory. Blocked rows will remain staged and unapplied."
                        confirmLabel="Apply import"
                        triggerLabel="Apply all ready rows"
                        triggerVariant="secondary"
                      >
                        <input type="hidden" name="jobId" value={selectedJob.id} />
                        <input type="hidden" name="returnTo" value={selectedJobHref} />
                        <div className="rounded-[18px] bg-slate-50 p-3 text-sm text-slate-600">
                          {actionableRows.length} row(s) are eligible to apply in this job.
                        </div>
                      </ConfirmActionForm>
                    </div>
                    <details className="mt-3 rounded-[18px] border border-slate-200 bg-white">
                      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-950">
                        Batch row decisions
                      </summary>
                      <div className="grid gap-2 border-t border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-3">
                        <form action={updateImportJobRowsBulk}>
                          <input type="hidden" name="jobId" value={selectedJob.id} />
                          <input type="hidden" name="operation" value="set_matched_update" />
                          <input type="hidden" name="returnTo" value={selectedJobHref} />
                          <SubmitButton variant="secondary" size="sm" className="w-full">
                            Update all matched ({selectedJob.matchedRows})
                          </SubmitButton>
                        </form>
                        <form action={updateImportJobRowsBulk}>
                          <input type="hidden" name="jobId" value={selectedJob.id} />
                          <input type="hidden" name="operation" value="set_unmatched_create" />
                          <input type="hidden" name="returnTo" value={selectedJobHref} />
                          <SubmitButton variant="secondary" size="sm" className="w-full">
                            Create all unmatched ({selectedJob.newRows})
                          </SubmitButton>
                        </form>
                        <form action={updateImportJobRowsBulk}>
                          <input type="hidden" name="jobId" value={selectedJob.id} />
                          <input type="hidden" name="operation" value="skip_ready" />
                          <input type="hidden" name="returnTo" value={selectedJobHref} />
                          <SubmitButton variant="secondary" size="sm" className="w-full">
                            Skip all ready ({actionableRows.length})
                          </SubmitButton>
                        </form>
                      </div>
                    </details>
                  </div>
                ) : (
                  <Button type="button" variant="secondary" disabled>
                    Import applied
                  </Button>
                )}
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                  <p className="font-medium text-slate-950">Review guidance</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Review matched rows before apply, keep blocked rows out of the apply set, and use bulk actions when the whole batch follows the same intent.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusBadge value={selectedJob.status} />
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      {actionableRows.length} ready
                    </span>
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                      {blockedRows.length} blocked
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {skippedRows.length} skipped
                    </span>
                  </div>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                  <p className="font-medium text-slate-950">Blockers</p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                    {blockedRows.length > 0 ? (
                      <>
                        <p>Blocked rows are excluded from apply until corrected upstream or re-staged.</p>
                        <p>Common causes are duplicate fingerprints in the import batch, missing required fields, or ambiguous matches.</p>
                      </>
                    ) : (
                      <p>No blocked rows in this job. Everything unresolved is either ready to apply or intentionally skipped.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {rowStatusFilters.map((filter) => {
                  const href = selectedJob
                    ? `/imports?selected=${selectedJob.id}&rowStatus=${filter.value}#staged-job`
                    : `/imports?rowStatus=${filter.value}#staged-job`;
                  const isActive = selectedRowFilter === filter.value;

                  return (
                    <Button
                      key={filter.value}
                      asChild
                      size="sm"
                      variant={isActive ? "default" : "secondary"}
                      className={cn("w-full sm:w-auto", isActive ? "!text-white [&_svg]:!text-white" : "")}
                    >
                      <Link href={href as Parameters<typeof Link>[0]["href"]}>{filter.label}</Link>
                    </Button>
                  );
                })}
              </div>

              <div className="rounded-[20px] border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-600">
                Showing {filteredRows.length} of {selectedJob.rows.length} row(s) in this staged job.
              </div>

              <div className="space-y-3 md:hidden">
                {filteredRows.map((row) => (
                  <div key={row.id} className={cn("rounded-[22px] border p-4", rowTone(row.status))}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">Row {row.rowIndex}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {row.resolvedMatchSlug ?? row.suggestedMatchSlug ?? "New record"}
                        </p>
                      </div>
                      <StatusBadge value={row.status} />
                    </div>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Apply as</p>
                        <div className="mt-2">
                          {selectedJob.status === "STAGED" && row.status !== ImportRowStatus.APPLIED ? (
                            <form action={updateImportRowResolution} className="space-y-2">
                              <input type="hidden" name="rowId" value={row.id} />
                              <input type="hidden" name="returnTo" value={selectedJobHref} />
                              <Select name="resolution" defaultValue={row.resolution}>
                                <option value="CREATE_NEW">Create new</option>
                                <option value="UPDATE_MATCH" disabled={!row.suggestedMatchId}>
                                  Update suggested match
                                </option>
                                <option value="SKIP">Skip</option>
                              </Select>
                              <SubmitButton variant="secondary" size="sm" className="w-full">
                                Save
                              </SubmitButton>
                            </form>
                          ) : (
                            <p className="mt-2">{resolutionLabel(row.resolution)}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Validation</p>
                        <div className="mt-2 space-y-1">
                          {row.validationErrors.length > 0 ? (
                            row.validationErrors.map((error) => <p key={error}>{error}</p>)
                          ) : (
                            <p>No validation issues</p>
                          )}
                        </div>
                      </div>
                      <details className="rounded-[18px] border border-slate-200 bg-white">
                        <summary className="cursor-pointer list-none px-4 py-3 font-medium text-slate-950">
                          View payload
                        </summary>
                        <div className="border-t border-slate-200 p-3">
                          <pre className="overflow-x-auto whitespace-pre-wrap rounded-[14px] bg-slate-950 p-3 text-xs leading-6 text-slate-100">
                            {JSON.stringify(row.data, null, 2)}
                          </pre>
                        </div>
                      </details>
                      <div className="flex flex-col gap-2">
                        {canSkipRow(row.status) ? (
                          <form action={updateImportRowDecision}>
                            <input type="hidden" name="rowId" value={row.id} />
                            <input type="hidden" name="decision" value="skip" />
                            <input type="hidden" name="returnTo" value={selectedJobHref} />
                            <SubmitButton variant="secondary" size="sm" className="w-full">
                              Skip row
                            </SubmitButton>
                          </form>
                        ) : null}
                        {canRetryRow(row.status) ? (
                          <form action={updateImportRowDecision}>
                            <input type="hidden" name="rowId" value={row.id} />
                            <input type="hidden" name="decision" value="retry" />
                            <input type="hidden" name="returnTo" value={selectedJobHref} />
                            <SubmitButton variant="secondary" size="sm" className="w-full">
                              Re-queue row
                            </SubmitButton>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[1120px] divide-y divide-slate-100 text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Row</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
                      <th className="min-w-[220px] px-4 py-3 font-medium whitespace-nowrap">Apply as</th>
                      <th className="min-w-[180px] px-4 py-3 font-medium whitespace-nowrap">Suggested match</th>
                      <th className="min-w-[220px] px-4 py-3 font-medium whitespace-nowrap">Validation</th>
                      <th className="min-w-[360px] px-4 py-3 font-medium whitespace-nowrap">Payload</th>
                      <th className="min-w-[160px] px-4 py-3 font-medium whitespace-nowrap">Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredRows.map((row) => (
                      <tr key={row.id} className={cn("align-top", rowTone(row.status))}>
                        <td className="px-4 py-4 font-medium text-slate-950 whitespace-nowrap">{row.rowIndex}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <StatusBadge value={row.status} />
                        </td>
                        <td className="min-w-[220px] px-4 py-4 text-slate-600">
                          {selectedJob.status === "STAGED" && row.status !== ImportRowStatus.APPLIED ? (
                            <form action={updateImportRowResolution} className="space-y-2">
                              <input type="hidden" name="rowId" value={row.id} />
                              <input type="hidden" name="returnTo" value={selectedJobHref} />
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
                        <td className="min-w-[180px] px-4 py-4 text-slate-600">
                          {row.resolvedMatchSlug ?? row.suggestedMatchSlug ?? "New record"}
                        </td>
                        <td className="min-w-[220px] px-4 py-4 text-slate-600">
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
                        <td className="min-w-[360px] px-4 py-4">
                          <details className="rounded-[18px] border border-slate-200 bg-white">
                            <summary className="cursor-pointer list-none px-4 py-3 font-medium text-slate-950">
                              View payload
                            </summary>
                            <div className="border-t border-slate-200 p-3">
                              <pre className="max-w-[480px] overflow-x-auto whitespace-pre-wrap rounded-[14px] bg-slate-950 p-3 text-xs leading-6 text-slate-100">
                                {JSON.stringify(row.data, null, 2)}
                              </pre>
                            </div>
                          </details>
                        </td>
                        <td className="min-w-[160px] px-4 py-4">
                          <div className="flex flex-col gap-2">
                            {canSkipRow(row.status) ? (
                              <form action={updateImportRowDecision}>
                                <input type="hidden" name="rowId" value={row.id} />
                                <input type="hidden" name="decision" value="skip" />
                                <input type="hidden" name="returnTo" value={selectedJobHref} />
                                <SubmitButton variant="secondary" size="sm">
                                  Skip row
                                </SubmitButton>
                              </form>
                            ) : null}
                            {canRetryRow(row.status) ? (
                              <form action={updateImportRowDecision}>
                                <input type="hidden" name="rowId" value={row.id} />
                                <input type="hidden" name="decision" value="retry" />
                                <input type="hidden" name="returnTo" value={selectedJobHref} />
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
    </div>
  );
}
