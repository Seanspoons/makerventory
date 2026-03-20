import { createInventoryItem } from "@/app/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { ArchiveForm } from "@/components/inventory/archive-form";
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
  const items = await getWishlist();

  const filtered = items.filter((item) => {
    const haystack = [item.name, item.category, item.vendor ?? "", item.notes ?? ""].join(" ").toLowerCase();
    return (q ? haystack.includes(q) : true) && (category === "ALL" ? true : item.category === category) && (status === "ALL" ? true : item.status === status);
  });

  const categories = Array.from(new Set(items.map((item) => item.category)));
  const nextBuy = filtered.find((item) => item.priority === "CRITICAL" || item.priority === "HIGH") ?? filtered[0] ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Purchase Planning"
        title="Wishlist"
        description="Prioritize spend, track research, and expose weak spots in the workshop before they block real work."
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

      <form className="space-y-5">
        <FilterBar>
          <div className="min-w-[220px] flex-1">
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

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <SectionCard
          title="What should I buy next?"
          description="A quick decision panel based on seeded priority and status signals."
        >
          {nextBuy ? (
            <div className="space-y-4">
              <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white">
                <StatusBadge value={nextBuy.priority} />
                <h2 className="mt-4 text-2xl font-semibold">{nextBuy.name}</h2>
                <p className="mt-2 text-sm text-slate-300">{nextBuy.category}</p>
                <p className="mt-4 text-3xl font-semibold">{formatCurrency(Number(nextBuy.estimatedCost ?? 0))}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{nextBuy.notes ?? "No notes yet."}</p>
              </div>
              <div className="space-y-3">
                {wishlistPriorityOrder.map((priority) => {
                  const count = filtered.filter((item) => item.priority === priority && item.status !== "PURCHASED").length;
                  return (
                    <div key={priority} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <StatusBadge value={priority} />
                      <p className="font-medium text-slate-950">{count}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No wishlist items match the current filters.</p>
          )}
        </SectionCard>

        <SectionCard title="Wishlist pipeline" description={`${filtered.length} items shown across planning stages.`}>
          <div className="space-y-3">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-950">{item.name}</p>
                      <StatusBadge value={item.priority} />
                      <StatusBadge value={item.status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {item.category} · {item.vendor ?? "Vendor TBD"} · {formatCurrency(Number(item.estimatedCost ?? 0))}
                    </p>
                    {item.notes ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.notes}</p> : null}
                    {item.purchaseUrl ? (
                      <a href={item.purchaseUrl} className="mt-2 inline-block text-sm font-medium text-blue-700 hover:text-blue-900">
                        Open vendor link
                      </a>
                    ) : null}
                  </div>
                  <ArchiveForm id={item.id} kind="wishlist" label={item.status === "PURCHASED" ? "Purchased" : "Mark purchased"} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
