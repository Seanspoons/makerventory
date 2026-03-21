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
import { getConsumables } from "@/lib/data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ConsumablesPage(props: { searchParams?: SearchParams }) {
  const searchParams = (await props.searchParams) ?? {};
  const q = typeof searchParams.q === "string" ? searchParams.q.toLowerCase() : "";
  const status = typeof searchParams.status === "string" ? searchParams.status : "LOW";
  const selected = typeof searchParams.selected === "string" ? searchParams.selected : "";
  const items = await getConsumables();
  const filtered = items.filter((item) => {
    const haystack = [item.name, item.category, item.notes ?? "", item.storageLocation ?? ""]
      .join(" ")
      .toLowerCase();
    return (q ? haystack.includes(q) : true) && (status === "ALL" ? true : item.status === status);
  });
  const detail = filtered.find((item) => item.id === selected) ?? filtered[0] ?? null;
  const belowThreshold = filtered.filter(
    (item) => Number(item.quantity) <= Number(item.reorderThreshold) || item.status === "LOW",
  ).length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inventory"
        title="Consumables"
        description="Keep reorder-sensitive supplies visible without turning the whole page into a spreadsheet."
      />
      <QuickAddShell title="Add consumable" description="Add a maintenance or cleaning item to operational stock.">
        <form action={createInventoryItem} className="grid gap-4 lg:grid-cols-2">
          <input type="hidden" name="kind" value="consumable" />
          <Input name="name" placeholder="Name" required />
          <Input name="category" placeholder="Category" required />
          <Input name="quantity" type="number" step="0.01" placeholder="Quantity" required />
          <Input name="unit" placeholder="Unit" required />
          <Input name="reorderThreshold" type="number" step="0.01" placeholder="Reorder threshold" required />
          <Input name="storageLocation" placeholder="Storage location" />
          <Textarea name="notes" placeholder="Notes" className="lg:col-span-2" />
          <div className="lg:col-span-2"><SubmitButton>Add consumable</SubmitButton></div>
        </form>
      </QuickAddShell>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Items in view</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{filtered.length}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Below threshold</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{belowThreshold}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Healthy stock</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {filtered.filter((item) => item.status === "HEALTHY").length}
          </p>
        </div>
      </div>

      <form className="space-y-5">
        <FilterBar>
          <div className="min-w-0 flex-1 sm:min-w-[220px]">
            <label className="mb-2 block text-sm text-slate-500">Search</label>
            <Input name="q" defaultValue={q} placeholder="Search consumables" />
          </div>
          <div className="w-full md:w-48">
            <label className="mb-2 block text-sm text-slate-500">Status</label>
            <Select name="status" defaultValue={status}>
              <option value="LOW">Needs attention first</option>
              <option value="ALL">All statuses</option>
              <option value="HEALTHY">Healthy</option>
              <option value="OUT">Out</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
          </div>
          <SubmitButton variant="secondary">Apply filters</SubmitButton>
        </FilterBar>
      </form>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
        <SectionCard
          title="Stock list"
          description="Use the left side for quick scanning, then open one record for thresholds and notes."
          className="xl:sticky xl:top-6"
        >
          <div className="space-y-3 xl:max-h-[calc(100vh-14rem)] xl:overflow-y-auto xl:pr-2">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-500">
                No consumables match the current filters.
              </div>
            ) : null}
            {filtered.map((item) => {
              const href = `/consumables?selected=${item.id}`;
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
                        {item.category} · {item.quantity.toString()} {item.unit}
                      </p>
                    </div>
                    <StatusBadge value={item.status} />
                  </div>
                  <p className={`mt-3 text-sm ${isSelected ? "text-white/80" : "text-slate-600"}`}>
                    Reorder at {item.reorderThreshold.toString()} {item.unit}
                  </p>
                </a>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title={detail ? detail.name : "Selected consumable"} description="Thresholds, storage context, and less-frequent controls stay here instead of in the list view.">
          {detail ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="break-words text-2xl font-semibold tracking-tight text-slate-950">{detail.name}</h2>
                    <StatusBadge value={detail.status} />
                  </div>
                  <p className="mt-2 break-words text-sm text-slate-500">
                    {detail.category} · {detail.quantity.toString()} {detail.unit} on hand · {detail.storageLocation ?? "No storage location"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <EditDialog title={`Edit ${detail.name}`} description="Update quantities, thresholds, and status for this consumable.">
                    <form action={updateInventoryItem} className="grid gap-4 lg:grid-cols-2">
                      <input type="hidden" name="kind" value="consumable" />
                      <input type="hidden" name="id" value={detail.id} />
                      <LabeledField label="Name">
                        <Input name="name" defaultValue={detail.name} required />
                      </LabeledField>
                      <LabeledField label="Category">
                        <Input name="category" defaultValue={detail.category} required />
                      </LabeledField>
                      <LabeledField label="Quantity">
                        <Input name="quantity" type="number" step="0.01" defaultValue={detail.quantity.toString()} required />
                      </LabeledField>
                      <LabeledField label="Unit">
                        <Input name="unit" defaultValue={detail.unit} required />
                      </LabeledField>
                      <LabeledField label="Reorder threshold">
                        <Input name="reorderThreshold" type="number" step="0.01" defaultValue={detail.reorderThreshold.toString()} required />
                      </LabeledField>
                      <LabeledField label="Storage location">
                        <Input name="storageLocation" defaultValue={detail.storageLocation ?? ""} />
                      </LabeledField>
                      <LabeledField label="Status">
                        <Select name="status" defaultValue={detail.status}>
                          <option value="HEALTHY">Healthy</option>
                          <option value="LOW">Low</option>
                          <option value="OUT">Out</option>
                          <option value="ARCHIVED">Archived</option>
                        </Select>
                      </LabeledField>
                      <div />
                      <LabeledField label="Notes" className="lg:col-span-2">
                        <Textarea name="notes" defaultValue={detail.notes ?? ""} />
                      </LabeledField>
                      <div className="lg:col-span-2"><SubmitButton>Save changes</SubmitButton></div>
                    </form>
                  </EditDialog>
                  <ArchiveForm id={detail.id} kind="consumable" />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">On hand</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{detail.quantity.toString()} {detail.unit}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Reorder threshold</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{detail.reorderThreshold.toString()} {detail.unit}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Storage</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{detail.storageLocation ?? "Not set"}</p>
                </div>
              </div>

              <details className="rounded-[24px] border border-slate-200 bg-white">
                <summary className="cursor-pointer list-none px-4 py-4 font-medium text-slate-950">
                  Notes and planning detail
                </summary>
                <div className="border-t border-slate-100 p-4 text-sm leading-7 text-slate-600">
                  {detail.notes ?? "No additional notes recorded for this item."}
                </div>
              </details>
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-500">
              No consumable matches the current filters.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
