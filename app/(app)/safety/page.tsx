import { createInventoryItem, updateInventoryItem } from "@/app/actions";
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
  const items = await getSafetyEquipment();
  const filtered = items.filter((item) => [item.name, item.type, item.notes ?? ""].join(" ").toLowerCase().includes(q));

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Air Quality" title="Safety & Air Quality" description="Make ventilation gaps and filter replacement obligations visible alongside active safety assets." />
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
      <form className="space-y-5">
        <FilterBar>
          <div className="min-w-[220px] flex-1"><label className="mb-2 block text-sm text-slate-500">Search</label><Input name="q" defaultValue={q} placeholder="Search safety equipment" /></div>
          <SubmitButton variant="secondary">Apply filters</SubmitButton>
        </FilterBar>
      </form>
      <SectionCard title="Safety inventory" description={`${filtered.length} safety and air quality records shown.`}>
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><p className="font-medium text-slate-950">{item.name}</p><StatusBadge value={item.status} /></div>
                  <p className="mt-2 text-sm text-slate-500">{item.type}</p>
                  {item.replacementSchedule ? <p className="mt-2 text-sm text-slate-600">{item.replacementSchedule}</p> : null}
                  {item.notes ? <p className="mt-2 text-sm text-slate-500">{item.notes}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <EditDialog title={`Edit ${item.name}`} description="Update safety status, schedule, and notes.">
                    <form action={updateInventoryItem} className="grid gap-4 lg:grid-cols-2">
                      <input type="hidden" name="kind" value="safety" />
                      <input type="hidden" name="id" value={item.id} />
                      <Input name="name" defaultValue={item.name} required />
                      <Input name="type" defaultValue={item.type} required />
                      <Select name="status" defaultValue={item.status}>
                        <option value="ACTIVE">Active</option>
                        <option value="NEEDS_ATTENTION">Needs attention</option>
                        <option value="PLANNED">Planned</option>
                        <option value="ARCHIVED">Archived</option>
                      </Select>
                      <Input name="replacementSchedule" defaultValue={item.replacementSchedule ?? ""} />
                      <Textarea name="notes" defaultValue={item.notes ?? ""} className="lg:col-span-2" />
                      <div className="lg:col-span-2"><SubmitButton>Save changes</SubmitButton></div>
                    </form>
                  </EditDialog>
                  <ArchiveForm id={item.id} kind="safety" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
