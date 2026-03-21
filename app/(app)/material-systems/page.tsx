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
import { getMaterialSystems } from "@/lib/data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MaterialSystemsPage(props: { searchParams?: SearchParams }) {
  const searchParams = (await props.searchParams) ?? {};
  const q = typeof searchParams.q === "string" ? searchParams.q.toLowerCase() : "";
  const type = typeof searchParams.type === "string" ? searchParams.type : "ALL";
  const items = await getMaterialSystems();

  const filtered = items.filter((item) => {
    const haystack = [item.name, item.notes ?? "", item.assignedPrinter?.name ?? ""].join(" ").toLowerCase();
    return (q ? haystack.includes(q) : true) && (type === "ALL" ? true : item.type === type);
  });

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Material Flow" title="Material Systems / Dryers" description="Track AMS units, dryers, assignments, and supported material notes across the workshop." />
      <QuickAddShell title="Add material system" description="Record a new AMS unit or dryer for compatibility and assignment planning.">
        <form action={createInventoryItem} className="grid gap-4 lg:grid-cols-2">
          <input type="hidden" name="kind" value="material-system" />
          <Input name="name" placeholder="Name" required />
          <Select name="type" defaultValue="DRYER">
            <option value="AMS_LITE">AMS Lite</option>
            <option value="AMS_2_PRO">AMS 2 Pro</option>
            <option value="AMS_HT">AMS HT</option>
            <option value="DRYER">Dryer</option>
          </Select>
          <Textarea name="supportedMaterialsNotes" placeholder="Supported materials notes" className="lg:col-span-2" />
          <Textarea name="notes" placeholder="Notes" className="lg:col-span-2" />
          <div className="lg:col-span-2"><SubmitButton>Add material system</SubmitButton></div>
        </form>
      </QuickAddShell>
      <form className="space-y-5">
        <FilterBar>
          <div className="min-w-0 flex-1 sm:min-w-[220px]"><label className="mb-2 block text-sm text-slate-500">Search</label><Input name="q" defaultValue={q} placeholder="Search systems" /></div>
          <div className="w-full md:w-48"><label className="mb-2 block text-sm text-slate-500">Type</label><Select name="type" defaultValue={type}><option value="ALL">All types</option><option value="AMS_LITE">AMS Lite</option><option value="AMS_2_PRO">AMS 2 Pro</option><option value="AMS_HT">AMS HT</option><option value="DRYER">Dryer</option></Select></div>
          <SubmitButton variant="secondary">Apply filters</SubmitButton>
        </FilterBar>
      </form>
      <SectionCard title="Systems inventory" description={`${filtered.length} systems in view.`}>
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-950">{item.name}</p>
                    <StatusBadge value={item.status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{item.type} · {item.assignedPrinter?.name ?? "Shared / unassigned"}</p>
                  {item.supportedMaterialsNotes ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.supportedMaterialsNotes}</p> : null}
                  {item.notes ? <p className="mt-2 text-sm leading-6 text-slate-500">{item.notes}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <EditDialog title={`Edit ${item.name}`} description="Update the material system or dryer record.">
                    <form action={updateInventoryItem} className="grid gap-4 lg:grid-cols-2">
                      <input type="hidden" name="kind" value="material-system" />
                      <input type="hidden" name="id" value={item.id} />
                      <Input name="name" defaultValue={item.name} required />
                      <Select name="type" defaultValue={item.type}>
                        <option value="AMS_LITE">AMS Lite</option>
                        <option value="AMS_2_PRO">AMS 2 Pro</option>
                        <option value="AMS_HT">AMS HT</option>
                        <option value="DRYER">Dryer</option>
                      </Select>
                      <Select name="status" defaultValue={item.status}>
                        <option value="ACTIVE">Active</option>
                        <option value="STANDBY">Standby</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="OFFLINE">Offline</option>
                        <option value="ARCHIVED">Archived</option>
                      </Select>
                      <div />
                      <Textarea name="supportedMaterialsNotes" defaultValue={item.supportedMaterialsNotes ?? ""} className="lg:col-span-2" />
                      <Textarea name="notes" defaultValue={item.notes ?? ""} className="lg:col-span-2" />
                      <div className="lg:col-span-2"><SubmitButton>Save changes</SubmitButton></div>
                    </form>
                  </EditDialog>
                  <ArchiveForm id={item.id} kind="material-system" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
