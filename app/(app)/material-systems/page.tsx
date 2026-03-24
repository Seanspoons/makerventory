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
import { getMaterialSystems, getPrinters } from "@/lib/data";
import { formatMaterialSystemType } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MaterialSystemsPage(props: { searchParams?: SearchParams }) {
  const searchParams = (await props.searchParams) ?? {};
  const q = typeof searchParams.q === "string" ? searchParams.q.toLowerCase() : "";
  const type = typeof searchParams.type === "string" ? searchParams.type : "ALL";
  const selected = typeof searchParams.selected === "string" ? searchParams.selected : "";
  const [items, printers] = await Promise.all([getMaterialSystems(), getPrinters()]);

  const filtered = items.filter((item) => {
    const haystack = [item.name, item.notes ?? "", item.assignedPrinter?.name ?? ""].join(" ").toLowerCase();
    return (q ? haystack.includes(q) : true) && (type === "ALL" ? true : item.type === type);
  });
  const detail = filtered.find((item) => item.id === selected) ?? filtered[0] ?? null;
  const assignedCount = filtered.filter((item) => item.assignedPrinterId).length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inventory"
        title="Material Systems"
        description="Track AMS units and dryers by assignment first, then open detail for supported materials and notes."
      />
      <QuickAddShell title="Add material system" description="Record a new AMS unit or dryer for compatibility and assignment planning.">
        <form action={createInventoryItem} className="grid gap-4 lg:grid-cols-2">
          <input type="hidden" name="kind" value="material-system" />
          <LabeledField label="Name">
            <Input name="name" placeholder="Bambu Lab AMS Lite" required />
          </LabeledField>
          <LabeledField label="Type">
            <Select name="type" defaultValue="DRYER">
              <option value="AMS_LITE">AMS Lite</option>
              <option value="AMS_2_PRO">AMS 2 Pro</option>
              <option value="AMS_HT">AMS HT</option>
              <option value="DRYER">Dryer</option>
            </Select>
          </LabeledField>
          <LabeledField label="Supported materials notes" className="lg:col-span-2">
            <Textarea name="supportedMaterialsNotes" placeholder="PLA, PETG, and dryer handling notes" />
          </LabeledField>
          <LabeledField label="Notes" className="lg:col-span-2">
            <Textarea name="notes" placeholder="Placement or operating notes" />
          </LabeledField>
          <div className="lg:col-span-2"><SubmitButton>Add material system</SubmitButton></div>
        </form>
      </QuickAddShell>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Systems in view</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{filtered.length}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Assigned to printer</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{assignedCount}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Unassigned / shared</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{filtered.length - assignedCount}</p>
        </div>
      </div>

      <form className="space-y-5">
        <FilterBar>
          <div className="min-w-0 flex-1 sm:min-w-[220px]"><label className="mb-2 block text-sm text-slate-500">Search</label><Input name="q" defaultValue={q} placeholder="Search systems" /></div>
          <div className="w-full md:w-48"><label className="mb-2 block text-sm text-slate-500">Type</label><Select name="type" defaultValue={type}><option value="ALL">All types</option><option value="AMS_LITE">AMS Lite</option><option value="AMS_2_PRO">AMS 2 Pro</option><option value="AMS_HT">AMS HT</option><option value="DRYER">Dryer</option></Select></div>
          <SubmitButton variant="secondary">Apply filters</SubmitButton>
        </FilterBar>
      </form>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
        <SectionCard title="Systems list" description="Scan assignment and status first, then open a system when you need compatibility notes." className="xl:sticky xl:top-6">
          <div className="space-y-3 xl:max-h-[calc(100vh-14rem)] xl:overflow-y-auto xl:pr-2">
            {filtered.map((item) => {
              const href = `/material-systems?selected=${item.id}`;
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
                        {formatMaterialSystemType(item.type)} · {item.assignedPrinter?.name ?? "Not assigned"}
                      </p>
                    </div>
                    <StatusBadge value={item.status} />
                  </div>
                </a>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title={detail ? detail.name : "Selected system"} description="Keep supported-material detail and less-common editing controls in one place.">
          {detail ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="break-words text-2xl font-semibold tracking-tight text-slate-950">{detail.name}</h2>
                    <StatusBadge value={detail.status} />
                  </div>
                  <p className="mt-2 break-words text-sm text-slate-500">
                    {formatMaterialSystemType(detail.type)} · {detail.assignedPrinter?.name ?? "Not assigned"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <EditDialog title={`Edit ${detail.name}`} description="Update the material system or dryer record.">
                    <form action={updateInventoryItem} className="grid gap-4 lg:grid-cols-2">
                      <input type="hidden" name="kind" value="material-system" />
                      <input type="hidden" name="id" value={detail.id} />
                      <input type="hidden" name="currentUpdatedAt" value={detail.updatedAt.toISOString()} />
                      <LabeledField label="Name">
                        <Input name="name" defaultValue={detail.name} required />
                      </LabeledField>
                      <LabeledField label="Type">
                        <Select name="type" defaultValue={detail.type}>
                          <option value="AMS_LITE">AMS Lite</option>
                          <option value="AMS_2_PRO">AMS 2 Pro</option>
                          <option value="AMS_HT">AMS HT</option>
                          <option value="DRYER">Dryer</option>
                        </Select>
                      </LabeledField>
                      <LabeledField label="Status">
                        <Select name="status" defaultValue={detail.status}>
                          <option value="ACTIVE">Active</option>
                          <option value="STANDBY">Standby</option>
                          <option value="MAINTENANCE">Maintenance</option>
                          <option value="OFFLINE">Offline</option>
                          <option value="ARCHIVED">Archived</option>
                        </Select>
                      </LabeledField>
                      <LabeledField label="Assigned printer">
                        <Select name="assignedPrinterId" defaultValue={detail.assignedPrinter?.id ?? ""}>
                          <option value="">Not assigned</option>
                          {printers.map((printer) => (
                            <option key={printer.id} value={printer.id}>
                              {printer.name}
                            </option>
                          ))}
                        </Select>
                      </LabeledField>
                      <LabeledField label="Supported materials notes" className="lg:col-span-2">
                        <Textarea name="supportedMaterialsNotes" defaultValue={detail.supportedMaterialsNotes ?? ""} />
                      </LabeledField>
                      <LabeledField label="Notes" className="lg:col-span-2">
                        <Textarea name="notes" defaultValue={detail.notes ?? ""} />
                      </LabeledField>
                      <div className="lg:col-span-2"><SubmitButton>Save changes</SubmitButton></div>
                    </form>
                  </EditDialog>
                  <ArchiveForm id={detail.id} kind="material-system" />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Assigned printer</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{detail.assignedPrinter?.name ?? "None linked"}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Compatible printers</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {detail.compatiblePrinters.map((printer) => printer.printer.name).join(", ") || "Not configured"}
                  </p>
                </div>
              </div>

              <details className="rounded-[24px] border border-slate-200 bg-white">
                <summary className="cursor-pointer list-none px-4 py-4 font-medium text-slate-950">
                  Supported materials and notes
                </summary>
                <div className="grid gap-4 border-t border-slate-100 p-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                    {detail.supportedMaterialsNotes ?? "No supported material notes recorded."}
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                    {detail.notes ?? "No additional notes recorded."}
                  </div>
                </div>
              </details>
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-500">
              No material systems match the current filters.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
