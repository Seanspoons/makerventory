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
import { getSmartPlugs } from "@/lib/data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SmartPlugsPage(props: { searchParams?: SearchParams }) {
  const searchParams = (await props.searchParams) ?? {};
  const q = typeof searchParams.q === "string" ? searchParams.q.toLowerCase() : "";
  const items = await getSmartPlugs();
  const filtered = items.filter((item) => [item.name, item.assignedDeviceLabel ?? "", item.notes ?? ""].join(" ").toLowerCase().includes(q));

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Controls" title="Smart Plugs" description="Track power control endpoints, assigned devices, and monitoring capability for future automation flows." />
      <QuickAddShell title="Add smart plug" description="Create a smart plug record for a printer, dryer, or environmental accessory.">
        <form action={createInventoryItem} className="grid gap-4 lg:grid-cols-2">
          <input type="hidden" name="kind" value="smart-plug" />
          <Input name="name" placeholder="Name" required />
          <Input name="assignedDeviceLabel" placeholder="Assigned device label" />
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" name="powerMonitoringCapable" className="rounded" /> Power monitoring capable</label>
          <div />
          <Textarea name="notes" placeholder="Notes" className="lg:col-span-2" />
          <div className="lg:col-span-2"><SubmitButton>Add smart plug</SubmitButton></div>
        </form>
      </QuickAddShell>
      <form className="space-y-5">
        <FilterBar>
          <div className="min-w-[220px] flex-1"><label className="mb-2 block text-sm text-slate-500">Search</label><Input name="q" defaultValue={q} placeholder="Search smart plugs" /></div>
          <SubmitButton variant="secondary">Apply filters</SubmitButton>
        </FilterBar>
      </form>
      <SectionCard title="Smart plug inventory" description={`${filtered.length} smart plugs shown.`}>
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><p className="font-medium text-slate-950">{item.name}</p><StatusBadge value={item.status} /></div>
                  <p className="mt-2 text-sm text-slate-500">{item.assignedDeviceLabel ?? item.printer?.name ?? "Unassigned"}</p>
                  <p className="mt-2 text-sm text-slate-600">{item.powerMonitoringCapable ? "Power monitoring enabled" : "Switch-only control"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <EditDialog title={`Edit ${item.name}`} description="Update assignment, status, and monitoring capability.">
                    <form action={updateInventoryItem} className="grid gap-4 lg:grid-cols-2">
                      <input type="hidden" name="kind" value="smart-plug" />
                      <input type="hidden" name="id" value={item.id} />
                      <Input name="name" defaultValue={item.name} required />
                      <Input name="assignedDeviceLabel" defaultValue={item.assignedDeviceLabel ?? ""} />
                      <Select name="status" defaultValue={item.status}>
                        <option value="ONLINE">Online</option>
                        <option value="OFFLINE">Offline</option>
                        <option value="DISABLED">Disabled</option>
                      </Select>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" name="powerMonitoringCapable" defaultChecked={item.powerMonitoringCapable} />
                        Power monitoring capable
                      </label>
                      <Textarea name="notes" defaultValue={item.notes ?? ""} className="lg:col-span-2" />
                      <div className="lg:col-span-2"><SubmitButton>Save changes</SubmitButton></div>
                    </form>
                  </EditDialog>
                  <ArchiveForm id={item.id} kind="smart-plug" label="Disable" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
