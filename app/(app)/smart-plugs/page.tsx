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
import { getPrinters, getSmartPlugs } from "@/lib/data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SmartPlugsPage(props: { searchParams?: SearchParams }) {
  const searchParams = (await props.searchParams) ?? {};
  const q = typeof searchParams.q === "string" ? searchParams.q.toLowerCase() : "";
  const selected = typeof searchParams.selected === "string" ? searchParams.selected : "";
  const [items, printers] = await Promise.all([getSmartPlugs(), getPrinters()]);
  const filtered = items.filter((item) => [item.name, item.assignedDeviceLabel ?? "", item.notes ?? ""].join(" ").toLowerCase().includes(q));
  const detail = filtered.find((item) => item.id === selected) ?? filtered[0] ?? null;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Controls" title="Smart Plugs" description="Track power control endpoints, assigned devices, and monitoring capability for future automation flows." />
      <QuickAddShell title="Add smart plug" description="Create a smart plug record for a printer, dryer, or environmental accessory.">
        <form action={createInventoryItem} className="grid gap-4 lg:grid-cols-2">
          <input type="hidden" name="kind" value="smart-plug" />
          <LabeledField label="Name">
            <Input name="name" placeholder="Printer Bench Plug" required />
          </LabeledField>
          <LabeledField label="Assigned device">
            <Input name="assignedDeviceLabel" placeholder="A1 Mini" />
          </LabeledField>
          <LabeledField label="Capabilities">
            <label className="flex min-h-[42px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700">
              <input type="checkbox" name="powerMonitoringCapable" className="rounded" />
              Power monitoring capable
            </label>
          </LabeledField>
          <div />
          <LabeledField label="Notes" className="lg:col-span-2">
            <Textarea name="notes" placeholder="Control grouping or automation notes" />
          </LabeledField>
          <div className="lg:col-span-2"><SubmitButton>Add smart plug</SubmitButton></div>
        </form>
      </QuickAddShell>
      <form className="space-y-5">
        <FilterBar>
          <div className="min-w-0 flex-1 sm:min-w-[220px]"><label className="mb-2 block text-sm text-slate-500">Search</label><Input name="q" defaultValue={q} placeholder="Search smart plugs" /></div>
          <SubmitButton variant="secondary">Apply filters</SubmitButton>
        </FilterBar>
      </form>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Plugs in view</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{filtered.length}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Online now</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {filtered.filter((item) => item.status === "ONLINE").length}
          </p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Monitoring capable</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {filtered.filter((item) => item.powerMonitoringCapable).length}
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
        <SectionCard
          title="Smart plug list"
          description="Scan assignment and control mode first, then open a plug for settings and quieter actions."
          className="xl:sticky xl:top-6"
        >
          <div className="space-y-3 xl:max-h-[calc(100vh-14rem)] xl:overflow-y-auto xl:pr-2">
            {filtered.map((item) => {
              const href = `/smart-plugs?selected=${item.id}`;
              const isSelected = detail?.id === item.id;
              return (
                <a
                  key={item.id}
                  href={href}
                  className={`block rounded-[24px] border p-4 transition ${
                    isSelected
                      ? "border-slate-900 bg-slate-950 text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`break-words font-medium ${isSelected ? "text-white" : "text-slate-950"}`}>{item.name}</p>
                      <p className={`mt-1 break-words text-sm ${isSelected ? "text-white/75" : "text-slate-500"}`}>
                        {item.assignedDeviceLabel ?? item.printer?.name ?? "Unassigned"}
                      </p>
                    </div>
                    <StatusBadge value={item.status} />
                  </div>
                </a>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title={detail ? detail.name : "Selected smart plug"}
          description="Device assignment, monitoring support, and less-common controls stay in the detail pane."
        >
          {detail ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="break-words text-2xl font-semibold tracking-tight text-slate-950">{detail.name}</h2>
                    <StatusBadge value={detail.status} />
                  </div>
                  <p className="mt-2 break-words text-sm text-slate-500">
                    {detail.assignedDeviceLabel ?? detail.printer?.name ?? "Unassigned"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <EditDialog title={`Edit ${detail.name}`} description="Update assignment, status, and monitoring capability.">
                    <form action={updateInventoryItem} className="grid gap-4 lg:grid-cols-2">
                      <input type="hidden" name="kind" value="smart-plug" />
                      <input type="hidden" name="id" value={detail.id} />
                      <LabeledField label="Name">
                        <Input name="name" defaultValue={detail.name} required />
                      </LabeledField>
                      <LabeledField label="Assigned device">
                        <Input name="assignedDeviceLabel" defaultValue={detail.assignedDeviceLabel ?? ""} />
                      </LabeledField>
                      <LabeledField label="Status">
                        <Select name="status" defaultValue={detail.status}>
                          <option value="ONLINE">Online</option>
                          <option value="OFFLINE">Offline</option>
                          <option value="DISABLED">Disabled</option>
                        </Select>
                      </LabeledField>
                      <LabeledField label="Assigned printer">
                        <Select name="assignedPrinterId" defaultValue={detail.printer?.id ?? ""}>
                          <option value="">Not assigned</option>
                          {printers.map((printer) => (
                            <option key={printer.id} value={printer.id}>
                              {printer.name}
                            </option>
                          ))}
                        </Select>
                      </LabeledField>
                      <LabeledField label="Capabilities">
                        <label className="flex min-h-[42px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700">
                          <input type="checkbox" name="powerMonitoringCapable" defaultChecked={detail.powerMonitoringCapable} />
                          Power monitoring capable
                        </label>
                      </LabeledField>
                      <LabeledField label="Notes" className="lg:col-span-2">
                        <Textarea name="notes" defaultValue={detail.notes ?? ""} />
                      </LabeledField>
                      <div className="lg:col-span-2"><SubmitButton>Save changes</SubmitButton></div>
                    </form>
                  </EditDialog>
                  <ArchiveForm id={detail.id} kind="smart-plug" label="Disable" triggerVariant="secondary" />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Control mode</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {detail.powerMonitoringCapable ? "Power monitoring enabled" : "Switch-only control"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Assigned device</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {detail.assignedDeviceLabel ?? detail.printer?.name ?? "Not assigned"}
                  </p>
                </div>
              </div>

              <details className="rounded-[24px] border border-slate-200 bg-white">
                <summary className="cursor-pointer list-none px-4 py-4 font-medium text-slate-950">
                  Notes
                </summary>
                <div className="border-t border-slate-100 p-4 text-sm leading-7 text-slate-600">
                  {detail.notes ?? "No additional notes recorded."}
                </div>
              </details>
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-500">
              No smart plugs match the current filters.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
