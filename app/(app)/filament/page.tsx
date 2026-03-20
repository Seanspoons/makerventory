import { createInventoryItem, updateFilamentState } from "@/app/actions";
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
import { getFilament } from "@/lib/data";
import { formatRelativeStock } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function FilamentPage(props: { searchParams?: SearchParams }) {
  const searchParams = (await props.searchParams) ?? {};
  const q = typeof searchParams.q === "string" ? searchParams.q.toLowerCase() : "";
  const material = typeof searchParams.material === "string" ? searchParams.material : "ALL";
  const brand = typeof searchParams.brand === "string" ? searchParams.brand : "ALL";
  const abrasive = typeof searchParams.abrasive === "string" ? searchParams.abrasive : "ALL";
  const hygroscopic = typeof searchParams.hygroscopic === "string" ? searchParams.hygroscopic : "ALL";
  const sort = typeof searchParams.sort === "string" ? searchParams.sort : "material";
  const filament = await getFilament();

  const filtered = filament
    .filter((item) => {
      const haystack = [
        item.brand,
        item.materialType,
        item.subtype ?? "",
        item.finish ?? "",
        item.color,
        item.notes ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return (
        (q ? haystack.includes(q) : true) &&
        (material === "ALL" ? true : item.materialType === material) &&
        (brand === "ALL" ? true : item.brand === brand) &&
        (abrasive === "ALL" ? true : abrasive === "YES" ? Boolean(item.abrasive) : !item.abrasive) &&
        (hygroscopic === "ALL" ? true : item.hygroscopicLevel === hygroscopic)
      );
    })
    .sort((a, b) => {
      if (sort === "remaining") {
        return (a.estimatedRemainingGrams ?? 0) - (b.estimatedRemainingGrams ?? 0);
      }
      if (sort === "brand") {
        return a.brand.localeCompare(b.brand);
      }
      return `${a.materialType}-${a.brand}-${a.color}`.localeCompare(`${b.materialType}-${b.brand}-${b.color}`);
    });

  const materialOptions = Array.from(new Set(filament.map((item) => item.materialType)));
  const brandOptions = Array.from(new Set(filament.map((item) => item.brand)));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Materials"
        title="Filament"
        description="Track stock, drying risk, abrasive handling, and spool readiness with a workflow tuned for real print planning."
      />

      <QuickAddShell
        title="Add filament"
        description="Capture a new spool or spool family with stock, handling notes, and compatibility guidance."
      >
        <form action={createInventoryItem} className="grid gap-4 lg:grid-cols-3">
          <input type="hidden" name="kind" value="filament" />
          <Input name="brand" placeholder="Brand" required />
          <Input name="materialType" placeholder="Material type" required />
          <Input name="color" placeholder="Color" required />
          <Input name="quantity" type="number" min="1" defaultValue="1" placeholder="Quantity" />
          <Input name="estimatedRemainingGrams" type="number" defaultValue="1000" placeholder="Remaining grams" />
          <Input name="storageLocation" placeholder="Storage location" />
          <Select name="hygroscopicLevel" defaultValue="">
            <option value="">Hygroscopic level</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </Select>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="abrasive" className="rounded" />
            Abrasive
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="dryingRequired" className="rounded" />
            Drying required
          </label>
          <Textarea name="notes" placeholder="Usage notes" className="lg:col-span-3" />
          <Textarea name="recommendationNotes" placeholder="Compatibility / recommendation notes" className="lg:col-span-3" />
          <div className="lg:col-span-3">
            <SubmitButton>Add filament</SubmitButton>
          </div>
        </form>
      </QuickAddShell>

      <form className="space-y-5">
        <FilterBar>
          <div className="min-w-[220px] flex-1">
            <label className="mb-2 block text-sm text-slate-500">Search</label>
            <Input name="q" defaultValue={q} placeholder="Search brand, color, or notes" />
          </div>
          <div className="w-full md:w-44">
            <label className="mb-2 block text-sm text-slate-500">Material</label>
            <Select name="material" defaultValue={material}>
              <option value="ALL">All materials</option>
              {materialOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full md:w-44">
            <label className="mb-2 block text-sm text-slate-500">Brand</label>
            <Select name="brand" defaultValue={brand}>
              <option value="ALL">All brands</option>
              {brandOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full md:w-36">
            <label className="mb-2 block text-sm text-slate-500">Abrasive</label>
            <Select name="abrasive" defaultValue={abrasive}>
              <option value="ALL">All</option>
              <option value="YES">Yes</option>
              <option value="NO">No</option>
            </Select>
          </div>
          <div className="w-full md:w-40">
            <label className="mb-2 block text-sm text-slate-500">Hygroscopic</label>
            <Select name="hygroscopic" defaultValue={hygroscopic}>
              <option value="ALL">All</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </Select>
          </div>
          <div className="w-full md:w-40">
            <label className="mb-2 block text-sm text-slate-500">Sort</label>
            <Select name="sort" defaultValue={sort}>
              <option value="material">Material</option>
              <option value="brand">Brand</option>
              <option value="remaining">Remaining grams</option>
            </Select>
          </div>
          <SubmitButton variant="secondary">Apply filters</SubmitButton>
        </FilterBar>
      </form>

      <SectionCard
        title="Filament inventory"
        description={`${filtered.length} filament entries shown. Abrasive and hygroscopic guidance is surfaced directly in the table.`}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Spool</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Handling</th>
                <th className="px-4 py-3 font-medium">Recommendation</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-950">
                      {item.brand} {item.color} {item.materialType}
                    </p>
                    <p className="mt-1 text-slate-500">
                      {item.subtype ?? item.finish ?? "Standard"} · {item.storageLocation ?? "No storage location"}
                    </p>
                    {item.notes ? <p className="mt-2 text-slate-500">{item.notes}</p> : null}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    <p>{item.quantity} spool(s)</p>
                    <p className="mt-1">{formatRelativeStock(item.estimatedRemainingGrams)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge value={item.status} />
                      {item.opened ? <StatusBadge value="IN_USE" /> : null}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    <p>{item.abrasive ? "Abrasive" : "Standard wear"}</p>
                    <p className="mt-1">{item.dryingRequired ? "Dry before long prints" : "Normal dry storage"}</p>
                    <p className="mt-1">{item.hygroscopicLevel ?? "Unspecified"} hygroscopic level</p>
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    <p>{item.filamentRecommendation?.recommendedNozzle ?? "Standard 0.4mm"}</p>
                    <p className="mt-1">
                      {item.filamentRecommendation?.hardenedNozzleNeeded ? "Hardened nozzle recommended" : "Standard nozzle acceptable"}
                    </p>
                    <p className="mt-1">
                      {item.filamentRecommendation?.dryerSuggested ? "Dryer / desiccant attention suggested" : "No extra drying workflow"}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-end gap-2">
                      <form action={updateFilamentState} className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="opened" value={item.opened ? "false" : "true"} />
                        <input type="hidden" name="nearlyEmpty" value={item.nearlyEmpty ? "false" : "true"} />
                        <input
                          type="hidden"
                          name="estimatedRemainingGrams"
                          value={Math.max(0, item.nearlyEmpty ? (item.estimatedRemainingGrams ?? 500) + 200 : (item.estimatedRemainingGrams ?? 500) - 200)}
                        />
                        <SubmitButton variant="ghost" size="sm">
                          {item.opened ? "Mark sealed" : "Mark opened"}
                        </SubmitButton>
                      </form>
                      <ArchiveForm id={item.id} kind="filament" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
