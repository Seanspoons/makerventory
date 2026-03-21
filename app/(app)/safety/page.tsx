import { createInventoryItem, updateInventoryItem } from "@/app/actions";
import { LabeledField } from "@/components/forms/labeled-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { ArchiveForm } from "@/components/inventory/archive-form";
import { EditDialog } from "@/components/inventory/edit-dialog";
import { FilterBar } from "@/components/inventory/filter-bar";
import { QuickAddShell } from "@/components/inventory/quick-add-shell";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getSafetyEquipment } from "@/lib/data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SafetyPage(props: { searchParams?: SearchParams }) {
  const searchParams = (await props.searchParams) ?? {};
  const q = typeof searchParams.q === "string" ? searchParams.q.toLowerCase() : "";
  const status = typeof searchParams.status === "string" ? searchParams.status : "NEEDS_ATTENTION";
  const selected = typeof searchParams.selected === "string" ? searchParams.selected : "";
  const items = await getSafetyEquipment();
  const filtered = items.filter((item) => {
    const haystack = [item.name, item.type, item.notes ?? ""].join(" ").toLowerCase();
    return (q ? haystack.includes(q) : true) && (status === "ALL" ? true : item.status === status);
  });
  const detail = filtered.find((item) => item.id === selected) ?? filtered[0] ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inventory"
        title="Safety & Air Quality"
        description="Keep active safeguards and attention items visible without turning this page into a maintenance log dump."
      />
      <QuickAddShell title="Add safety item" description="Track a new purifier, exhaust component, or workshop safety asset.">
        <form action={createInventoryItem} className="grid gap-4 lg:grid-cols-2">
          <input type="hidden" name="kind" value="safety" />
          <Input name="name" placeholder="Name" required />
          <Input name="type" placeholder="Type" required />
          <Input name="replacementSchedule" placeholder="Replacement schedule" />
          <Textarea name="notes" placeholder="Notes" className="lg:col-span-2" />
          <div className="lg:col-span-2"><SubmitButton>Add safety item</SubmitButton></div>
        </form>
      </QuickAddShell>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Items in view</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{filtered.length}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Need attention</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {filtered.filter((item) => item.status === "NEEDS_ATTENTION").length}
          </p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Active safeguards</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {filtered.filter((item) => item.status === "ACTIVE").length}
          </p>
        </div>
      </div>

      <form className="space-y-5">
        <FilterBar>
          <div className="min-w-0 flex-1 sm:min-w-[220px]"><label className="mb-2 block text-sm text-slate-500">Search</label><Input name="q" defaultValue={q} placeholder="Search safety equipment" /></div>
          <div className="w-full md:w-52">
            <label className="mb-2 block text-sm text-slate-500">Status</label>
            <Select name="status" defaultValue={status}>
              <option value="NEEDS_ATTENTION">Needs attention first</option>
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PLANNED">Planned</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
          </div>
          <SubmitButton variant="secondary">Apply filters</SubmitButton>
        </FilterBar>
      </form>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
        <SectionCard title="Safety list" description="Use the list to scan what is active versus what needs work, then open an item for schedule and notes." className="xl:sticky xl:top-6">
          <div className="space-y-3 xl:max-h-[calc(100vh-14rem)] xl:overflow-y-auto xl:pr-2">
            {filtered.map((item) => {
              const href = `/safety?selected=${item.id}`;
              const isSelected = detail?.id === item.id;
              return (
                <a
                  key={item.id}
                  href={href}
                  className={`block rounded-[24px] border p-4 transition ${isSelected ? "border-slate-900 bg-slate-950 text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`break-words font-medium ${isSelected ? "text-white" : "text-slate-950"}`}>{item.name}</p>
                      <p className={`mt-1 break-words text-sm ${isSelected ? "text-white/75" : "text-slate-500"}`}>
                        {item.type}
                      </p>
                    </div>
                    <StatusBadge value={item.status} />
                  </div>
                </a>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title={detail ? detail.name : "Selected safety item"} description="Replacement schedule, notes, and quieter actions stay in the detail pane.">
          {detail ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="break-words text-2xl font-semibold tracking-tight text-slate-950">{detail.name}</h2>
                    <StatusBadge value={detail.status} />
                  </div>
                  <p className="mt-2 break-words text-sm text-slate-500">{detail.type}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <EditDialog title={`Edit ${detail.name}`} description="Update safety status, schedule, and notes.">
                    <form action={updateInventoryItem} className="grid gap-4 lg:grid-cols-2">
                      <input type="hidden" name="kind" value="safety" />
                      <input type="hidden" name="id" value={detail.id} />
                      <LabeledField label="Name">
                        <Input name="name" defaultValue={detail.name} required />
                      </LabeledField>
                      <LabeledField label="Type">
                        <Input name="type" defaultValue={detail.type} required />
                      </LabeledField>
                      <LabeledField label="Status">
                        <Select name="status" defaultValue={detail.status}>
                          <option value="ACTIVE">Active</option>
                          <option value="NEEDS_ATTENTION">Needs attention</option>
                          <option value="PLANNED">Planned</option>
                          <option value="ARCHIVED">Archived</option>
                        </Select>
                      </LabeledField>
                      <LabeledField label="Replacement schedule">
                        <Input name="replacementSchedule" defaultValue={detail.replacementSchedule ?? ""} />
                      </LabeledField>
                      <LabeledField label="Notes" className="lg:col-span-2">
                        <Textarea name="notes" defaultValue={detail.notes ?? ""} />
                      </LabeledField>
                      <div className="lg:col-span-2"><SubmitButton>Save changes</SubmitButton></div>
                    </form>
                  </EditDialog>
                  <ArchiveForm id={detail.id} kind="safety" />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Replacement schedule</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{detail.replacementSchedule ?? "Not set"}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Recent maintenance</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {detail.maintenanceLogs.length > 0
                      ? new Date(detail.maintenanceLogs[0].date).toLocaleDateString()
                      : "No service logged"}
                  </p>
                </div>
              </div>

              <details className="rounded-[24px] border border-slate-200 bg-white">
                <summary className="cursor-pointer list-none px-4 py-4 font-medium text-slate-950">
                  Notes and maintenance detail
                </summary>
                <div className="border-t border-slate-100 p-4 text-sm leading-7 text-slate-600">
                  {detail.notes ?? "No additional notes recorded."}
                </div>
              </details>
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-500">
              No safety items match the current filters.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
