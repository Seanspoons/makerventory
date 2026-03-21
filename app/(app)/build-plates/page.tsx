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
import { getBuildPlates } from "@/lib/data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BuildPlatesPage(props: { searchParams?: SearchParams }) {
  const searchParams = (await props.searchParams) ?? {};
  const q = typeof searchParams.q === "string" ? searchParams.q.toLowerCase() : "";
  const size = typeof searchParams.size === "string" ? searchParams.size : "ALL";
  const selected = typeof searchParams.selected === "string" ? searchParams.selected : "";
  const items = await getBuildPlates();
  const filtered = items.filter((item) => {
    const haystack = [item.name, item.surfaceType, item.notes ?? ""].join(" ").toLowerCase();
    return (q ? haystack.includes(q) : true) && (size === "ALL" ? true : item.sizeLabel === size);
  });
  const detail = filtered.find((item) => item.id === selected) ?? filtered[0] ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inventory"
        title="Build Plates"
        description="Show plate family, wear state, and assignment first, then keep compatibility detail behind the selected panel."
      />
      <QuickAddShell title="Add build plate" description="Add a new build plate with its size family and surface information.">
        <form action={createInventoryItem} className="grid gap-4 lg:grid-cols-2">
          <input type="hidden" name="kind" value="build-plate" />
          <Input name="name" placeholder="Name" required />
          <Input name="surfaceType" placeholder="Surface type" required />
          <Input name="sizeLabel" placeholder="Size label" required />
          <Input name="sizeMm" placeholder="Size mm" type="number" required />
          <Textarea name="notes" placeholder="Notes" className="lg:col-span-2" />
          <div className="lg:col-span-2"><SubmitButton>Add build plate</SubmitButton></div>
        </form>
      </QuickAddShell>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Plates in view</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{filtered.length}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Installed now</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{filtered.filter((item) => item.installedOnPrinter).length}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Worn or retired</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{filtered.filter((item) => item.status === "WORN" || item.status === "RETIRED").length}</p>
        </div>
      </div>

      <form className="space-y-5">
        <FilterBar>
          <div className="min-w-0 flex-1 sm:min-w-[220px]"><label className="mb-2 block text-sm text-slate-500">Search</label><Input name="q" defaultValue={q} placeholder="Search plates" /></div>
          <div className="w-full md:w-48"><label className="mb-2 block text-sm text-slate-500">Size</label><Select name="size" defaultValue={size}><option value="ALL">All sizes</option><option value="180mm">180mm</option><option value="256mm">256mm</option></Select></div>
          <SubmitButton variant="secondary">Apply filters</SubmitButton>
        </FilterBar>
      </form>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
        <SectionCard title="Plate list" description="The list stays focused on size, surface, and wear state so swapping decisions are faster." className="xl:sticky xl:top-6">
          <div className="space-y-3 xl:max-h-[calc(100vh-14rem)] xl:overflow-y-auto xl:pr-2">
            {filtered.map((item) => {
              const href = `/build-plates?selected=${item.id}`;
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
                        {item.sizeLabel} · {item.surfaceType}
                      </p>
                    </div>
                    <StatusBadge value={item.status} />
                  </div>
                </a>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title={detail ? detail.name : "Selected build plate"} description="Assignment and compatibility details stay here so the list view can stay easier to scan.">
          {detail ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="break-words text-2xl font-semibold tracking-tight text-slate-950">{detail.name}</h2>
                    <StatusBadge value={detail.status} />
                  </div>
                  <p className="mt-2 break-words text-sm text-slate-500">
                    {detail.sizeLabel} · {detail.surfaceType} · {detail.sizeMm} mm
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <EditDialog title={`Edit ${detail.name}`} description="Update plate sizing, surface, and wear state.">
                    <form action={updateInventoryItem} className="grid gap-4 lg:grid-cols-2">
                      <input type="hidden" name="kind" value="build-plate" />
                      <input type="hidden" name="id" value={detail.id} />
                      <Input name="name" defaultValue={detail.name} required />
                      <Input name="surfaceType" defaultValue={detail.surfaceType} required />
                      <Input name="sizeLabel" defaultValue={detail.sizeLabel} required />
                      <Input name="sizeMm" type="number" defaultValue={detail.sizeMm} required />
                      <Select name="status" defaultValue={detail.status}>
                        <option value="AVAILABLE">Available</option>
                        <option value="IN_USE">In use</option>
                        <option value="WORN">Worn</option>
                        <option value="RETIRED">Retired</option>
                      </Select>
                      <div />
                      <Textarea name="notes" defaultValue={detail.notes ?? ""} className="lg:col-span-2" />
                      <div className="lg:col-span-2"><SubmitButton>Save changes</SubmitButton></div>
                    </form>
                  </EditDialog>
                  <ArchiveForm id={detail.id} kind="build-plate" label="Retire" />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Installed on printer</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{detail.installedOnPrinter?.name ?? "Not assigned"}</p>
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
                  Notes and compatibility detail
                </summary>
                <div className="border-t border-slate-100 p-4 text-sm leading-7 text-slate-600">
                  {detail.notes ?? "No additional notes recorded."}
                </div>
              </details>
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-500">
              No build plates match the current filters.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
