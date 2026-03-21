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
  const selected = typeof searchParams.selected === "string" ? searchParams.selected : "";
  const items = await getHotends();
  const filtered = items.filter((item) => {
    const haystack = [item.name, item.materialType, item.notes ?? ""].join(" ").toLowerCase();
    return (q ? haystack.includes(q) : true) && (material === "ALL" ? true : item.materialType === material);
  });
  const detail = filtered.find((item) => item.id === selected) ?? filtered[0] ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inventory"
        title="Hotends"
        description="Surface stock health and installed usage first, then keep nozzle detail and compatibility one click deeper."
      />
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

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Hotends in view</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{filtered.length}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">In use</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{filtered.reduce((sum, item) => sum + item.inUseCount, 0)}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Spare count</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{filtered.reduce((sum, item) => sum + item.spareCount, 0)}</p>
        </div>
      </div>

      <form className="space-y-5">
        <FilterBar>
          <div className="min-w-0 flex-1 sm:min-w-[220px]"><label className="mb-2 block text-sm text-slate-500">Search</label><Input name="q" defaultValue={q} placeholder="Search hotends" /></div>
          <div className="w-full md:w-48"><label className="mb-2 block text-sm text-slate-500">Material</label><Select name="material" defaultValue={material}><option value="ALL">All materials</option><option value="Stainless Steel">Stainless Steel</option><option value="Hardened Steel">Hardened Steel</option></Select></div>
          <SubmitButton variant="secondary">Apply filters</SubmitButton>
        </FilterBar>
      </form>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
        <SectionCard title="Hotend list" description="Keep the stock picture light in the list view and move compatibility detail into the selected panel." className="xl:sticky xl:top-6">
          <div className="space-y-3 xl:max-h-[calc(100vh-14rem)] xl:overflow-y-auto xl:pr-2">
            {filtered.map((item) => {
              const href = `/hotends?selected=${item.id}`;
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
                        {item.nozzleSize.toString()} mm · {item.materialType}
                      </p>
                    </div>
                    <StatusBadge value={item.status} />
                  </div>
                  <div className={`mt-3 grid gap-2 text-sm md:grid-cols-2 ${isSelected ? "text-white/80" : "text-slate-600"}`}>
                    <p>Qty {item.quantity}</p>
                    <p>In use {item.inUseCount}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title={detail ? detail.name : "Selected hotend"} description="Keep nozzle stock, compatibility, and advanced edit controls together in one calmer detail area.">
          {detail ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="break-words text-2xl font-semibold tracking-tight text-slate-950">{detail.name}</h2>
                    <StatusBadge value={detail.status} />
                  </div>
                  <p className="mt-2 break-words text-sm text-slate-500">
                    {detail.nozzleSize.toString()} mm · {detail.materialType}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <EditDialog title={`Edit ${detail.name}`} description="Update nozzle sizing, stock counts, and status.">
                    <form action={updateInventoryItem} className="grid gap-4 lg:grid-cols-2">
                      <input type="hidden" name="kind" value="hotend" />
                      <input type="hidden" name="id" value={detail.id} />
                      <Input name="name" defaultValue={detail.name} required />
                      <Input name="materialType" defaultValue={detail.materialType} required />
                      <Input name="nozzleSize" type="number" step="0.1" defaultValue={detail.nozzleSize.toString()} required />
                      <Input name="quantity" type="number" defaultValue={detail.quantity} required />
                      <Input name="inUseCount" type="number" defaultValue={detail.inUseCount} required />
                      <Input name="spareCount" type="number" defaultValue={detail.spareCount} required />
                      <Select name="status" defaultValue={detail.status}>
                        <option value="AVAILABLE">Available</option>
                        <option value="IN_USE">In use</option>
                        <option value="LOW_STOCK">Low stock</option>
                        <option value="RETIRED">Retired</option>
                      </Select>
                      <div />
                      <Textarea name="notes" defaultValue={detail.notes ?? ""} className="lg:col-span-2" />
                      <div className="lg:col-span-2"><SubmitButton>Save changes</SubmitButton></div>
                    </form>
                  </EditDialog>
                  <ArchiveForm id={detail.id} kind="hotend" label="Retire" />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Quantity</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{detail.quantity}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">In use</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{detail.inUseCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Spare</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{detail.spareCount}</p>
                </div>
              </div>

              <details className="rounded-[24px] border border-slate-200 bg-white">
                <summary className="cursor-pointer list-none px-4 py-4 font-medium text-slate-950">
                  Compatibility and notes
                </summary>
                <div className="grid gap-4 border-t border-slate-100 p-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                    Compatible printers: {detail.compatiblePrinters.map((printer) => printer.printer.name).join(", ") || "None configured"}
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                    {detail.notes ?? "No additional notes recorded."}
                  </div>
                </div>
              </details>
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-500">
              No hotends match the current filters.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
