import { createInventoryItem } from "@/app/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { ArchiveForm } from "@/components/inventory/archive-form";
import { FilterBar } from "@/components/inventory/filter-bar";
import { QuickAddShell } from "@/components/inventory/quick-add-shell";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getConsumables } from "@/lib/data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ConsumablesPage(props: { searchParams?: SearchParams }) {
  const searchParams = (await props.searchParams) ?? {};
  const q = typeof searchParams.q === "string" ? searchParams.q.toLowerCase() : "";
  const items = await getConsumables();
  const filtered = items.filter((item) => [item.name, item.category, item.notes ?? ""].join(" ").toLowerCase().includes(q));

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Support Supplies" title="Consumables" description="Monitor maintenance stock, reorder thresholds, and drawer-level storage so service work never stalls." />
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
      <form className="space-y-5">
        <FilterBar>
          <div className="min-w-[220px] flex-1"><label className="mb-2 block text-sm text-slate-500">Search</label><Input name="q" defaultValue={q} placeholder="Search consumables" /></div>
          <SubmitButton variant="secondary">Apply filters</SubmitButton>
        </FilterBar>
      </form>
      <SectionCard title="Consumable stock" description={`${filtered.length} consumables shown.`}>
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-950">{item.name}</p>
                    <StatusBadge value={item.status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{item.category} · {item.quantity.toString()} {item.unit} on hand</p>
                  <p className="mt-2 text-sm text-slate-600">Reorder threshold: {item.reorderThreshold.toString()} {item.unit}</p>
                </div>
                <ArchiveForm id={item.id} kind="consumable" />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
