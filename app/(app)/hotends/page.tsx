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
import { getHotends } from "@/lib/data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function HotendsPage(props: { searchParams?: SearchParams }) {
  const searchParams = (await props.searchParams) ?? {};
  const q = typeof searchParams.q === "string" ? searchParams.q.toLowerCase() : "";
  const material = typeof searchParams.material === "string" ? searchParams.material : "ALL";
  const items = await getHotends();
  const filtered = items.filter((item) => {
    const haystack = [item.name, item.materialType, item.notes ?? ""].join(" ").toLowerCase();
    return (q ? haystack.includes(q) : true) && (material === "ALL" ? true : item.materialType === material);
  });

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Extrusion" title="Hotends / Nozzles" description="Track nozzle material, quantity, in-use count, and printer compatibility for wear-sensitive workflows." />
      <QuickAddShell title="Add hotend" description="Record a new nozzle or hotend as soon as it joins the spare parts inventory.">
        <form action={createInventoryItem} className="grid gap-4 lg:grid-cols-2">
          <input type="hidden" name="kind" value="hotend" />
          <Input name="name" placeholder="Name" required />
          <Input name="materialType" placeholder="Material type" required />
          <Input name="nozzleSize" placeholder="Nozzle size" type="number" step="0.1" required />
          <Input name="quantity" placeholder="Quantity" type="number" defaultValue="1" required />
          <Textarea name="notes" placeholder="Notes" className="lg:col-span-2" />
          <div className="lg:col-span-2"><SubmitButton>Add hotend</SubmitButton></div>
        </form>
      </QuickAddShell>
      <form className="space-y-5">
        <FilterBar>
          <div className="min-w-0 flex-1 sm:min-w-[220px]"><label className="mb-2 block text-sm text-slate-500">Search</label><Input name="q" defaultValue={q} placeholder="Search hotends" /></div>
          <div className="w-full md:w-48"><label className="mb-2 block text-sm text-slate-500">Material</label><Select name="material" defaultValue={material}><option value="ALL">All materials</option><option value="Stainless Steel">Stainless Steel</option><option value="Hardened Steel">Hardened Steel</option></Select></div>
          <SubmitButton variant="secondary">Apply filters</SubmitButton>
        </FilterBar>
      </form>
      <SectionCard title="Hotend inventory" description={`${filtered.length} hotend records shown.`}>
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-950">{item.name}</p>
                    <StatusBadge value={item.status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{item.nozzleSize.toString()} mm · {item.materialType}</p>
                  <p className="mt-2 text-sm text-slate-600">Quantity {item.quantity} · In use {item.inUseCount} · Spare {item.spareCount}</p>
                  <p className="mt-2 text-sm text-slate-500">Compatible printers: {item.compatiblePrinters.map((printer) => printer.printer.name).join(", ") || "None configured"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <EditDialog title={`Edit ${item.name}`} description="Update nozzle sizing, stock counts, and status.">
                    <form action={updateInventoryItem} className="grid gap-4 lg:grid-cols-2">
                      <input type="hidden" name="kind" value="hotend" />
                      <input type="hidden" name="id" value={item.id} />
                      <Input name="name" defaultValue={item.name} required />
                      <Input name="materialType" defaultValue={item.materialType} required />
                      <Input name="nozzleSize" type="number" step="0.1" defaultValue={item.nozzleSize.toString()} required />
                      <Input name="quantity" type="number" defaultValue={item.quantity} required />
                      <Input name="inUseCount" type="number" defaultValue={item.inUseCount} required />
                      <Input name="spareCount" type="number" defaultValue={item.spareCount} required />
                      <Select name="status" defaultValue={item.status}>
                        <option value="AVAILABLE">Available</option>
                        <option value="IN_USE">In use</option>
                        <option value="LOW_STOCK">Low stock</option>
                        <option value="RETIRED">Retired</option>
                      </Select>
                      <div />
                      <Textarea name="notes" defaultValue={item.notes ?? ""} className="lg:col-span-2" />
                      <div className="lg:col-span-2"><SubmitButton>Save changes</SubmitButton></div>
                    </form>
                  </EditDialog>
                  <ArchiveForm id={item.id} kind="hotend" label="Retire" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
