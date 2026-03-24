import { createInventoryItem, updateFilamentState, updateInventoryItem } from "@/app/actions";
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

  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, item) => {
    const key = item.materialType;
    acc[key] ??= [];
    acc[key].push(item);
    return acc;
  }, {});

  const materialOptions = Array.from(new Set(filament.map((item) => item.materialType)));
  const brandOptions = Array.from(new Set(filament.map((item) => item.brand)));
  const lowStockCount = filtered.filter((item) => item.status === "LOW" || item.nearlyEmpty).length;
  const dryingCount = filtered.filter(
    (item) => item.dryingRequired || item.filamentRecommendation?.dryerSuggested,
  ).length;
  const abrasiveCount = filtered.filter((item) => item.abrasive).length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inventory"
        title="Filament"
        description="See stock state first, handling risks second, and deeper technical detail only when it is relevant."
      />

      <QuickAddShell
        title="Add filament"
        description="Capture a new spool or spool family with stock, handling notes, and compatibility guidance."
      >
        <form action={createInventoryItem} className="grid gap-4 lg:grid-cols-3">
          <input type="hidden" name="kind" value="filament" />
          <LabeledField label="Brand">
            <Input name="brand" placeholder="Bambu Lab" required />
          </LabeledField>
          <LabeledField label="Material type">
            <Input name="materialType" placeholder="PLA" required />
          </LabeledField>
          <LabeledField label="Color">
            <Input name="color" placeholder="White" required />
          </LabeledField>
          <LabeledField label="Quantity">
            <Input name="quantity" type="number" min="1" defaultValue="1" placeholder="1" />
          </LabeledField>
          <LabeledField label="Estimated remaining grams">
            <Input name="estimatedRemainingGrams" type="number" defaultValue="1000" placeholder="1000" />
          </LabeledField>
          <LabeledField label="Storage location">
            <Input name="storageLocation" placeholder="Dry box shelf" />
          </LabeledField>
          <LabeledField label="Hygroscopic level">
            <Select name="hygroscopicLevel" defaultValue="">
              <option value="">Select level</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </Select>
          </LabeledField>
          <LabeledField label="Material handling">
            <label className="flex min-h-[42px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700">
              <input type="checkbox" name="abrasive" className="rounded" />
              Abrasive
            </label>
          </LabeledField>
          <LabeledField label="Drying">
            <label className="flex min-h-[42px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700">
              <input type="checkbox" name="dryingRequired" className="rounded" />
              Drying required
            </label>
          </LabeledField>
          <LabeledField label="Usage notes" className="lg:col-span-3">
            <Textarea name="notes" placeholder="Recommended use or handling notes" />
          </LabeledField>
          <LabeledField label="Compatibility / recommendation notes" className="lg:col-span-3">
            <Textarea name="recommendationNotes" placeholder="Nozzle or drying guidance" />
          </LabeledField>
          <div className="lg:col-span-3">
            <SubmitButton>Add filament</SubmitButton>
          </div>
        </form>
      </QuickAddShell>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Visible spools</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {filtered.reduce((sum, item) => sum + item.quantity, 0)}
          </p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Low stock now</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{lowStockCount}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Needs drying review</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{dryingCount}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Abrasive materials</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{abrasiveCount}</p>
        </div>
      </div>

      <form className="space-y-5">
        <FilterBar>
          <div className="min-w-0 flex-1 sm:min-w-[220px]">
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
        description="Grouped by material so the current stock picture is easier to scan before you open technical detail."
      >
        <div className="space-y-6">
          {Object.keys(grouped).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-500">
              No filament matches the current filters.
            </div>
          ) : null}

          {Object.entries(grouped).map(([materialType, items]) => (
            <div key={materialType} className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Material group
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                    {materialType}
                  </h2>
                </div>
                <p className="text-sm text-slate-500">
                  {items.reduce((sum, item) => sum + item.quantity, 0)} spool(s) in view
                </p>
              </div>

              <div className="grid gap-3">
                {items.map((item) => {
                  const needsDrying =
                    item.dryingRequired || item.filamentRecommendation?.dryerSuggested;
                  const lowNow = item.status === "LOW" || item.nearlyEmpty;

                  return (
                    <div key={item.id} className="rounded-[24px] border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="break-words text-lg font-semibold tracking-tight text-slate-950">
                              {item.brand} {item.color}
                            </p>
                            <StatusBadge value={item.status} />
                            {item.opened ? <StatusBadge value="IN_USE" /> : null}
                            {lowNow ? <StatusBadge value="LOW" /> : null}
                          </div>
                          <p className="mt-2 break-words text-sm text-slate-500">
                            {item.subtype ?? item.finish ?? "Standard"} · {item.storageLocation ?? "No storage location"}
                          </p>
                          <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                            <p>{item.quantity} spool(s)</p>
                            <p>{formatRelativeStock(item.estimatedRemainingGrams)}</p>
                            <p>{needsDrying ? "Needs drying review" : "Normal dry storage"}</p>
                            <p>{item.abrasive ? "Abrasive handling" : "Standard wear"}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:max-w-[320px] lg:justify-end">
                          <EditDialog
                            title={`Edit ${item.brand} ${item.color} ${item.materialType}`}
                            description="Update stock, handling, and recommendation fields for this filament record."
                          >
                            <form action={updateInventoryItem} className="grid gap-4 lg:grid-cols-2">
                              <input type="hidden" name="kind" value="filament" />
                              <input type="hidden" name="id" value={item.id} />
                              <input type="hidden" name="currentUpdatedAt" value={item.updatedAt.toISOString()} />
                              <LabeledField label="Brand">
                                <Input name="brand" defaultValue={item.brand} required />
                              </LabeledField>
                              <LabeledField label="Material type">
                                <Input name="materialType" defaultValue={item.materialType} required />
                              </LabeledField>
                              <LabeledField label="Subtype">
                                <Input name="subtype" defaultValue={item.subtype ?? ""} />
                              </LabeledField>
                              <LabeledField label="Finish">
                                <Input name="finish" defaultValue={item.finish ?? ""} />
                              </LabeledField>
                              <LabeledField label="Color">
                                <Input name="color" defaultValue={item.color} required />
                              </LabeledField>
                              <LabeledField label="Quantity">
                                <Input name="quantity" type="number" defaultValue={item.quantity} required />
                              </LabeledField>
                              <LabeledField label="Estimated remaining grams">
                                <Input
                                  name="estimatedRemainingGrams"
                                  type="number"
                                  defaultValue={item.estimatedRemainingGrams ?? 1000}
                                />
                              </LabeledField>
                              <LabeledField label="Storage location">
                                <Input name="storageLocation" defaultValue={item.storageLocation ?? ""} />
                              </LabeledField>
                              <LabeledField label="Stock state">
                                <Select name="status" defaultValue={item.status}>
                                  <option value="HEALTHY">Healthy</option>
                                  <option value="LOW">Low</option>
                                  <option value="OUT">Out</option>
                                  <option value="ARCHIVED">Archived</option>
                                </Select>
                              </LabeledField>
                              <LabeledField label="Hygroscopic level">
                                <Select name="hygroscopicLevel" defaultValue={item.hygroscopicLevel ?? ""}>
                                  <option value="">Unspecified</option>
                                  <option value="LOW">Low</option>
                                  <option value="MEDIUM">Medium</option>
                                  <option value="HIGH">High</option>
                                </Select>
                              </LabeledField>
                              <LabeledField label="Recommended nozzle">
                                <Input
                                  name="recommendedNozzle"
                                  defaultValue={item.filamentRecommendation?.recommendedNozzle ?? ""}
                                />
                              </LabeledField>
                              <fieldset className="rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
                                <legend className="px-1 text-sm font-medium text-slate-700">Handling and stock flags</legend>
                                <div className="mt-2 flex flex-wrap gap-4">
                                <label className="flex items-center gap-2 text-sm text-slate-700">
                                  <input type="checkbox" name="opened" defaultChecked={item.opened} />
                                  Opened
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-700">
                                  <input type="checkbox" name="nearlyEmpty" defaultChecked={item.nearlyEmpty} />
                                  Nearly empty
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-700">
                                  <input type="checkbox" name="abrasive" defaultChecked={Boolean(item.abrasive)} />
                                  Abrasive
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-700">
                                  <input type="checkbox" name="dryingRequired" defaultChecked={Boolean(item.dryingRequired)} />
                                  Drying required
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-700">
                                  <input
                                    type="checkbox"
                                    name="dryerSuggested"
                                    defaultChecked={Boolean(item.filamentRecommendation?.dryerSuggested)}
                                  />
                                  Dryer suggested
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-700">
                                  <input
                                    type="checkbox"
                                    name="hardenedNozzleNeeded"
                                    defaultChecked={Boolean(item.filamentRecommendation?.hardenedNozzleNeeded)}
                                  />
                                  Hardened nozzle needed
                                </label>
                                </div>
                              </fieldset>
                              <LabeledField label="Usage notes" className="lg:col-span-2">
                                <Textarea name="notes" defaultValue={item.notes ?? ""} />
                              </LabeledField>
                              <LabeledField label="Compatibility / recommendation notes" className="lg:col-span-2">
                                <Textarea
                                  name="recommendationNotes"
                                  defaultValue={item.filamentRecommendation?.notes ?? ""}
                                />
                              </LabeledField>
                              <div className="lg:col-span-2">
                                <SubmitButton>Save changes</SubmitButton>
                              </div>
                            </form>
                          </EditDialog>
                          <ArchiveForm id={item.id} kind="filament" />
                        </div>
                      </div>

                      <details className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50/80">
                        <summary className="cursor-pointer list-none px-4 py-3 font-medium text-slate-950">
                          Quick stock actions
                        </summary>
                        <div className="border-t border-slate-200 p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm leading-6 text-slate-500">
                              Use this after a print or stock check instead of opening the full edit form.
                            </p>
                            <p className="text-sm font-medium text-slate-700">
                              {item.estimatedRemainingGrams ?? 1000} g remaining
                            </p>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {[50, 100, 250].map((grams) => (
                              <form key={grams} action={updateFilamentState}>
                                <input type="hidden" name="id" value={item.id} />
                                <input type="hidden" name="currentUpdatedAt" value={item.updatedAt.toISOString()} />
                                <input type="hidden" name="gramsUsed" value={grams} />
                                <input type="hidden" name="markOpened" value="true" />
                                <SubmitButton variant="secondary" size="sm">
                                  Use {grams} g
                                </SubmitButton>
                              </form>
                            ))}
                            <form action={updateFilamentState}>
                              <input type="hidden" name="id" value={item.id} />
                              <input type="hidden" name="currentUpdatedAt" value={item.updatedAt.toISOString()} />
                              <input type="hidden" name="setToFull" value="true" />
                              <input type="hidden" name="clearNearlyEmpty" value="true" />
                              <SubmitButton variant="secondary" size="sm">
                                Reset to full spool
                              </SubmitButton>
                            </form>
                            <form action={updateFilamentState}>
                              <input type="hidden" name="id" value={item.id} />
                              <input type="hidden" name="currentUpdatedAt" value={item.updatedAt.toISOString()} />
                              <input type="hidden" name="toggleOpened" value="true" />
                              <SubmitButton variant="secondary" size="sm">
                                {item.opened ? "Mark sealed" : "Mark opened"}
                              </SubmitButton>
                            </form>
                            <form action={updateFilamentState}>
                              <input type="hidden" name="id" value={item.id} />
                              <input type="hidden" name="currentUpdatedAt" value={item.updatedAt.toISOString()} />
                              <input type="hidden" name="toggleNearlyEmpty" value="true" />
                              <input
                                type="hidden"
                                name="estimatedRemainingGrams"
                                value={Math.max(
                                  0,
                                  item.nearlyEmpty
                                    ? (item.estimatedRemainingGrams ?? 500) + 200
                                    : (item.estimatedRemainingGrams ?? 500) - 200,
                                )}
                              />
                              <SubmitButton variant="secondary" size="sm">
                                {item.nearlyEmpty ? "Clear nearly empty" : "Mark nearly empty"}
                              </SubmitButton>
                            </form>
                          </div>

                          <form action={updateFilamentState} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,180px)_auto]">
                            <div>
                              <label className="mb-2 block text-sm text-slate-500">Exact grams used</label>
                              <Input
                                name="gramsUsed"
                                type="number"
                                min="1"
                                step="1"
                                defaultValue="60"
                              />
                            </div>
                            <div className="flex items-end">
                              <input type="hidden" name="id" value={item.id} />
                              <input type="hidden" name="currentUpdatedAt" value={item.updatedAt.toISOString()} />
                              <input type="hidden" name="markOpened" value="true" />
                              <SubmitButton size="sm" className="w-full sm:w-auto">
                                Log print usage
                              </SubmitButton>
                            </div>
                          </form>
                        </div>
                      </details>

                      <details className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50/80">
                        <summary className="cursor-pointer list-none px-4 py-3 font-medium text-slate-950">
                          Technical detail and recommendations
                        </summary>
                        <div className="grid gap-3 border-t border-slate-100 p-4 md:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-sm text-slate-500">Recommendation</p>
                            <p className="mt-2 font-medium text-slate-950">
                              {item.filamentRecommendation?.recommendedNozzle ?? "Standard 0.4mm"}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {item.filamentRecommendation?.hardenedNozzleNeeded
                                ? "Hardened nozzle recommended for wear resistance."
                                : "Standard nozzle is acceptable for this stock."}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-sm text-slate-500">Handling notes</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {item.filamentRecommendation?.notes ??
                                item.notes ??
                                "No additional handling notes recorded."}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              Hygroscopic level: {item.hygroscopicLevel ?? "Unspecified"}
                            </p>
                          </div>
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
