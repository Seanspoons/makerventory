import { createInventoryItem, updateInventoryItem } from "@/app/actions";
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
  const items = await getTools();
  const filtered = items.filter((item) => [item.name, item.category, item.notes ?? ""].join(" ").toLowerCase().includes(q));

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Bench Support" title="Tools / Parts" description="Keep the non-printing essentials visible so prototype jobs and fixture builds do not depend on memory." />
      <QuickAddShell title="Add tool or part" description="Track supporting hardware, fasteners, and project parts.">
        <form action={createInventoryItem} className="grid gap-4 lg:grid-cols-2">
          <input type="hidden" name="kind" value="tool" />
          <Input name="name" placeholder="Name" required />
          <Input name="category" placeholder="Category" required />
          <Input name="quantity" type="number" placeholder="Quantity" defaultValue="1" required />
          <Input name="storageLocation" placeholder="Storage location" />
          <Textarea name="notes" placeholder="Notes" className="lg:col-span-2" />
          <div className="lg:col-span-2"><SubmitButton>Add tool / part</SubmitButton></div>
        </form>
      </QuickAddShell>
      <form className="space-y-5">
        <FilterBar>
          <div className="min-w-[220px] flex-1"><label className="mb-2 block text-sm text-slate-500">Search</label><Input name="q" defaultValue={q} placeholder="Search tools or parts" /></div>
          <SubmitButton variant="secondary">Apply filters</SubmitButton>
        </FilterBar>
      </form>
      <SectionCard title="Tools and parts inventory" description={`${filtered.length} support items shown.`}>
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-medium text-slate-950">{item.name}</p>
                  <p className="mt-2 text-sm text-slate-500">{item.category} · Qty {item.quantity}</p>
                  <p className="mt-2 text-sm text-slate-600">{item.storageLocation ?? "No storage location"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <EditDialog title={`Edit ${item.name}`} description="Update category, quantity, and storage location for this support item.">
                    <form action={updateInventoryItem} className="grid gap-4 lg:grid-cols-2">
                      <input type="hidden" name="kind" value="tool" />
                      <input type="hidden" name="id" value={item.id} />
                      <Input name="name" defaultValue={item.name} required />
                      <Input name="category" defaultValue={item.category} required />
                      <Input name="quantity" type="number" defaultValue={item.quantity} required />
                      <Input name="storageLocation" defaultValue={item.storageLocation ?? ""} />
                      <Textarea name="notes" defaultValue={item.notes ?? ""} className="lg:col-span-2" />
                      <div className="lg:col-span-2"><SubmitButton>Save changes</SubmitButton></div>
                    </form>
                  </EditDialog>
                  <ArchiveForm id={item.id} kind="tool" label="Archive" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
