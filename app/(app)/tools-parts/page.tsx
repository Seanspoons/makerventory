import { createInventoryItem, updateInventoryItem } from "@/app/actions";
import { LabeledField } from "@/components/forms/labeled-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { ArchiveForm } from "@/components/inventory/archive-form";
import { EditDialog } from "@/components/inventory/edit-dialog";
import { FilterBar } from "@/components/inventory/filter-bar";
import { QuickAddShell } from "@/components/inventory/quick-add-shell";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getTools } from "@/lib/data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ToolsPartsPage(props: { searchParams?: SearchParams }) {
  const searchParams = (await props.searchParams) ?? {};
  const q = typeof searchParams.q === "string" ? searchParams.q.toLowerCase() : "";
  const selected = typeof searchParams.selected === "string" ? searchParams.selected : "";
  const items = await getTools();
  const filtered = items.filter((item) => [item.name, item.category, item.notes ?? ""].join(" ").toLowerCase().includes(q));
  const detail = filtered.find((item) => item.id === selected) ?? filtered[0] ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inventory"
        title="Tools / Parts"
        description="Keep supporting parts discoverable without forcing every fastener and fixture into a dense list."
      />
      <QuickAddShell title="Add tool or part" description="Track supporting hardware, fasteners, and project parts.">
        <form action={createInventoryItem} className="grid gap-4 lg:grid-cols-2">
          <input type="hidden" name="kind" value="tool" />
          <LabeledField label="Name">
            <Input name="name" placeholder="M3 Socket Head Screws" required />
          </LabeledField>
          <LabeledField label="Category">
            <Input name="category" placeholder="Hardware" required />
          </LabeledField>
          <LabeledField label="Quantity">
            <Input name="quantity" type="number" placeholder="1" defaultValue="1" required />
          </LabeledField>
          <LabeledField label="Storage location">
            <Input name="storageLocation" placeholder="Drawer 4" />
          </LabeledField>
          <LabeledField label="Notes" className="lg:col-span-2">
            <Textarea name="notes" placeholder="Sizes, project use, or organization notes" />
          </LabeledField>
          <div className="lg:col-span-2"><SubmitButton>Add tool / part</SubmitButton></div>
        </form>
      </QuickAddShell>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Items in view</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{filtered.length}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Distinct categories</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{new Set(filtered.map((item) => item.category)).size}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Tracked quantity</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{filtered.reduce((sum, item) => sum + item.quantity, 0)}</p>
        </div>
      </div>

      <form className="space-y-5">
        <FilterBar>
          <div className="min-w-0 flex-1 sm:min-w-[220px]"><label className="mb-2 block text-sm text-slate-500">Search</label><Input name="q" defaultValue={q} placeholder="Search tools or parts" /></div>
          <SubmitButton variant="secondary">Apply filters</SubmitButton>
        </FilterBar>
      </form>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
        <SectionCard title="Bench support list" description="Quickly scan names, category, and quantity before opening notes or storage detail." className="xl:sticky xl:top-6">
          <div className="space-y-3 xl:max-h-[calc(100vh-14rem)] xl:overflow-y-auto xl:pr-2">
            {filtered.map((item) => {
              const href = `/tools-parts?selected=${item.id}`;
              const isSelected = detail?.id === item.id;
              return (
                <a
                  key={item.id}
                  href={href}
                  className={`block rounded-[24px] border p-4 transition ${isSelected ? "border-slate-900 bg-slate-950 text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                >
                  <p className={`break-words font-medium ${isSelected ? "text-white" : "text-slate-950"}`}>{item.name}</p>
                  <p className={`mt-2 break-words text-sm ${isSelected ? "text-white/75" : "text-slate-500"}`}>
                    {item.category} · Qty {item.quantity}
                  </p>
                </a>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title={detail ? detail.name : "Selected tool or part"} description="Storage detail, notes, and less-common edit controls live here instead of in every row.">
          {detail ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h2 className="break-words text-2xl font-semibold tracking-tight text-slate-950">{detail.name}</h2>
                  <p className="mt-2 break-words text-sm text-slate-500">
                    {detail.category} · Qty {detail.quantity}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <EditDialog title={`Edit ${detail.name}`} description="Update category, quantity, and storage location for this support item.">
                    <form action={updateInventoryItem} className="grid gap-4 lg:grid-cols-2">
                      <input type="hidden" name="kind" value="tool" />
                      <input type="hidden" name="id" value={detail.id} />
                      <input type="hidden" name="currentUpdatedAt" value={detail.updatedAt.toISOString()} />
                      <LabeledField label="Name">
                        <Input name="name" defaultValue={detail.name} required />
                      </LabeledField>
                      <LabeledField label="Category">
                        <Input name="category" defaultValue={detail.category} required />
                      </LabeledField>
                      <LabeledField label="Quantity">
                        <Input name="quantity" type="number" defaultValue={detail.quantity} required />
                      </LabeledField>
                      <LabeledField label="Storage location">
                        <Input name="storageLocation" defaultValue={detail.storageLocation ?? ""} />
                      </LabeledField>
                      <LabeledField label="Notes" className="lg:col-span-2">
                        <Textarea name="notes" defaultValue={detail.notes ?? ""} />
                      </LabeledField>
                      <div className="lg:col-span-2"><SubmitButton>Save changes</SubmitButton></div>
                    </form>
                  </EditDialog>
                  <ArchiveForm id={detail.id} kind="tool" label="Archive" />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Storage location</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{detail.storageLocation ?? "Not set"}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Category</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{detail.category}</p>
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
              No tools or parts match the current filters.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
