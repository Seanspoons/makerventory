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
import { getWishlist, wishlistPriorityOrder } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function WishlistPage(props: { searchParams?: SearchParams }) {
  const searchParams = (await props.searchParams) ?? {};
  const q = typeof searchParams.q === "string" ? searchParams.q.toLowerCase() : "";
  const category = typeof searchParams.category === "string" ? searchParams.category : "ALL";
  const status = typeof searchParams.status === "string" ? searchParams.status : "ALL";
  const selected = typeof searchParams.selected === "string" ? searchParams.selected : "";
  const items = await getWishlist();

  const filtered = items.filter((item) => {
    const haystack = [item.name, item.category, item.vendor ?? "", item.notes ?? ""].join(" ").toLowerCase();
    return (q ? haystack.includes(q) : true) && (category === "ALL" ? true : item.category === category) && (status === "ALL" ? true : item.status === status);
  });
  const categories = Array.from(new Set(items.map((item) => item.category)));
  const detail = filtered.find((item) => item.id === selected) ?? filtered[0] ?? null;
  const nextBuy = filtered.find((item) => item.priority === "CRITICAL" || item.priority === "HIGH") ?? filtered[0] ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Planning"
        title="Wishlist"
        description="Keep purchase decisions clear by surfacing what matters next and hiding the long tail until you need it."
      />

      <QuickAddShell
        title="Add wishlist item"
        description="Capture a planned purchase with enough detail to make the buying decision actionable later."
      >
        <form action={createInventoryItem} className="grid gap-4 lg:grid-cols-3">
          <input type="hidden" name="kind" value="wishlist" />
          <Input name="name" placeholder="Item name" required />
          <Input name="category" placeholder="Category" required />
          <Select name="priority" defaultValue="MEDIUM">
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </Select>
          <Input name="estimatedCost" type="number" step="0.01" placeholder="Estimated cost" />
          <Input name="vendor" placeholder="Vendor" />
          <Input name="purchaseUrl" placeholder="Purchase URL" />
          <Textarea name="notes" placeholder="Notes" className="lg:col-span-3" />
          <div className="lg:col-span-3">
            <SubmitButton>Add wishlist item</SubmitButton>
          </div>
        </form>
      </QuickAddShell>

      <div className="grid gap-3 md:grid-cols-4">
        {wishlistPriorityOrder.map((priority) => {
          const count = filtered.filter((item) => item.priority === priority && item.status !== "PURCHASED").length;
          return (
            <div key={priority} className="rounded-[24px] border border-slate-200 bg-white p-4">
              <StatusBadge value={priority} />
              <p className="mt-3 text-3xl font-semibold text-slate-950">{count}</p>
              <p className="mt-2 text-sm text-slate-500">{priority.toLowerCase()} priority open items</p>
            </div>
          );
        })}
      </div>

      <form className="space-y-5">
        <FilterBar>
          <div className="min-w-0 flex-1 sm:min-w-[220px]">
            <label className="mb-2 block text-sm text-slate-500">Search</label>
            <Input name="q" defaultValue={q} placeholder="Search wishlist" />
          </div>
          <div className="w-full md:w-48">
            <label className="mb-2 block text-sm text-slate-500">Category</label>
            <Select name="category" defaultValue={category}>
              <option value="ALL">All categories</option>
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full md:w-48">
            <label className="mb-2 block text-sm text-slate-500">Status</label>
            <Select name="status" defaultValue={status}>
              <option value="ALL">All statuses</option>
              <option value="PLANNED">Planned</option>
              <option value="RESEARCHING">Researching</option>
              <option value="READY_TO_BUY">Ready to buy</option>
              <option value="PURCHASED">Purchased</option>
            </Select>
          </div>
          <SubmitButton variant="secondary">Apply filters</SubmitButton>
        </FilterBar>
      </form>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
        <SectionCard title="Planning queue" description="Use the left rail for ranking and pipeline stage, then open one item when you need full purchase context." className="xl:sticky xl:top-6">
          {nextBuy ? (
            <div className="mb-4 rounded-[24px] border border-slate-900 bg-slate-950 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Buy next</p>
              <p className="mt-2 text-xl font-semibold">{nextBuy.name}</p>
              <p className="mt-2 text-sm text-slate-300">
                {nextBuy.category} · {formatCurrency(Number(nextBuy.estimatedCost ?? 0))}
              </p>
            </div>
          ) : null}
          <div className="space-y-3 xl:max-h-[calc(100vh-14rem)] xl:overflow-y-auto xl:pr-2">
            {filtered.map((item) => {
              const href = `/wishlist?selected=${item.id}`;
              const isSelected = detail?.id === item.id;
              return (
                <a
                  key={item.id}
                  href={href}
                  className={`block rounded-[24px] border p-4 transition ${isSelected ? "border-slate-900 bg-slate-950 text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`break-words font-medium ${isSelected ? "text-white" : "text-slate-950"}`}>{item.name}</p>
                    <StatusBadge value={item.priority} />
                    <StatusBadge value={item.status} />
                  </div>
                  <p className={`mt-2 break-words text-sm ${isSelected ? "text-white/75" : "text-slate-500"}`}>
                    {item.category} · {item.vendor ?? "Vendor TBD"} · {formatCurrency(Number(item.estimatedCost ?? 0))}
                  </p>
                </a>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title={detail ? detail.name : "Selected wishlist item"} description="Use this detail view for buying context, notes, and quieter edit controls.">
          {detail ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-2xl font-semibold tracking-tight text-slate-950">{detail.name}</h2>
                    <StatusBadge value={detail.priority} />
                    <StatusBadge value={detail.status} />
                  </div>
                  <p className="mt-2 break-words text-sm text-slate-500">
                    {detail.category} · {detail.vendor ?? "Vendor TBD"} · {formatCurrency(Number(detail.estimatedCost ?? 0))}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <EditDialog title={`Edit ${detail.name}`} description="Update priority, vendor details, and buying status.">
                    <form action={updateInventoryItem} className="grid gap-4 lg:grid-cols-2">
                      <input type="hidden" name="kind" value="wishlist" />
                      <input type="hidden" name="id" value={detail.id} />
                      <LabeledField label="Name">
                        <Input name="name" defaultValue={detail.name} required />
                      </LabeledField>
                      <LabeledField label="Category">
                        <Input name="category" defaultValue={detail.category} required />
                      </LabeledField>
                      <LabeledField label="Priority">
                        <Select name="priority" defaultValue={detail.priority}>
                          <option value="CRITICAL">Critical</option>
                          <option value="HIGH">High</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="LOW">Low</option>
                        </Select>
                      </LabeledField>
                      <LabeledField label="Status">
                        <Select name="status" defaultValue={detail.status}>
                          <option value="PLANNED">Planned</option>
                          <option value="RESEARCHING">Researching</option>
                          <option value="READY_TO_BUY">Ready to buy</option>
                          <option value="PURCHASED">Purchased</option>
                        </Select>
                      </LabeledField>
                      <LabeledField label="Estimated cost">
                        <Input name="estimatedCost" type="number" step="0.01" defaultValue={Number(detail.estimatedCost ?? 0)} />
                      </LabeledField>
                      <LabeledField label="Vendor">
                        <Input name="vendor" defaultValue={detail.vendor ?? ""} />
                      </LabeledField>
                      <LabeledField label="Purchase URL" className="lg:col-span-2">
                        <Input name="purchaseUrl" defaultValue={detail.purchaseUrl ?? ""} />
                      </LabeledField>
                      <LabeledField label="Notes" className="lg:col-span-2">
                        <Textarea name="notes" defaultValue={detail.notes ?? ""} />
                      </LabeledField>
                      <div className="lg:col-span-2"><SubmitButton>Save changes</SubmitButton></div>
                    </form>
                  </EditDialog>
                  <ArchiveForm id={detail.id} kind="wishlist" label={detail.status === "PURCHASED" ? "Purchased" : "Mark purchased"} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Estimated cost</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(Number(detail.estimatedCost ?? 0))}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Vendor</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{detail.vendor ?? "Not selected"}</p>
                </div>
              </div>

              {detail.purchaseUrl ? (
                <a href={detail.purchaseUrl} className="inline-block text-sm font-medium text-blue-700 hover:text-blue-900">
                  Open vendor link
                </a>
              ) : null}

              <details className="rounded-[24px] border border-slate-200 bg-white">
                <summary className="cursor-pointer list-none px-4 py-4 font-medium text-slate-950">
                  Notes and purchasing context
                </summary>
                <div className="border-t border-slate-100 p-4 text-sm leading-7 text-slate-600">
                  {detail.notes ?? "No additional notes recorded for this wishlist item."}
                </div>
              </details>
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-500">
              No wishlist items match the current filters.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
