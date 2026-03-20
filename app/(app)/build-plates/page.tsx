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
import { getBuildPlates } from "@/lib/data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BuildPlatesPage(props: { searchParams?: SearchParams }) {
  const searchParams = (await props.searchParams) ?? {};
  const q = typeof searchParams.q === "string" ? searchParams.q.toLowerCase() : "";
  const size = typeof searchParams.size === "string" ? searchParams.size : "ALL";
  const items = await getBuildPlates();
  const filtered = items.filter((item) => {
    const haystack = [item.name, item.surfaceType, item.notes ?? ""].join(" ").toLowerCase();
    return (q ? haystack.includes(q) : true) && (size === "ALL" ? true : item.sizeLabel === size);
  });

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Surfaces" title="Build Plates" description="Keep plate families, surface wear, and printer compatibility visible when swapping jobs or troubleshooting adhesion." />
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
      <form className="space-y-5">
        <FilterBar>
          <div className="min-w-[220px] flex-1"><label className="mb-2 block text-sm text-slate-500">Search</label><Input name="q" defaultValue={q} placeholder="Search plates" /></div>
          <div className="w-full md:w-48"><label className="mb-2 block text-sm text-slate-500">Size</label><Select name="size" defaultValue={size}><option value="ALL">All sizes</option><option value="180mm">180mm</option><option value="256mm">256mm</option></Select></div>
          <SubmitButton variant="secondary">Apply filters</SubmitButton>
        </FilterBar>
      </form>
      <SectionCard title="Plate inventory" description={`${filtered.length} plates shown.`}>
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-950">{item.name}</p>
                    <StatusBadge value={item.status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{item.sizeLabel} · {item.surfaceType}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Compatible printers: {item.compatiblePrinters.map((printer) => printer.printer.name).join(", ") || "None configured"}
                  </p>
                  {item.installedOnPrinter ? <p className="mt-2 text-sm text-slate-500">Installed on {item.installedOnPrinter.name}</p> : null}
                </div>
                <ArchiveForm id={item.id} kind="build-plate" label="Retire" />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
