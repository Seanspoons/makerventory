import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getBuildPlates, getHotends, getMaterialSystems, getPrinters, getSmartPlugs } from "@/lib/data";
import { cn, formatBuildPlateSize, formatMaterialSystemType } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PrintersPage(props: { searchParams?: SearchParams }) {
  const searchParams = (await props.searchParams) ?? {};
  const q = typeof searchParams.q === "string" ? searchParams.q.toLowerCase() : "";
  const status = typeof searchParams.status === "string" ? searchParams.status : "ACTIVE";
  const selected = typeof searchParams.selected === "string" ? searchParams.selected : "";
  const [printers, hotends, buildPlates, materialSystems, smartPlugs] = await Promise.all([
    getPrinters(),
    getHotends(),
    getBuildPlates(),
    getMaterialSystems(),
    getSmartPlugs(),
  ]);

  const filtered = printers.filter((printer) => {
    const haystack = [
      printer.name,
      printer.brand,
      printer.model,
      printer.location ?? "",
      printer.notes ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return (q ? haystack.includes(q) : true) && (status === "ALL" ? true : printer.status === status);
  });

  const detail = filtered.find((printer) => printer.id === selected) ?? filtered[0] ?? null;
  const setupGaps = filtered.filter(
    (printer) =>
      !printer.installedHotendId ||
      !printer.installedPlateId ||
      printer.materialSystems.length === 0,
  ).length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inventory"
        title="Printers"
        description="Scan fleet health first, then open a printer when you need full setup and maintenance detail."
      />

      <QuickAddShell
        title="Add printer"
        description="Create a new printer record with just enough information to bring it into the fleet view."
      >
        <form action={createInventoryItem} className="grid gap-4 lg:grid-cols-2">
          <input type="hidden" name="kind" value="printer" />
          <LabeledField label="Printer name">
            <Input name="name" placeholder="Bambu Lab A1 Mini" required />
          </LabeledField>
          <LabeledField label="Brand">
            <Input name="brand" placeholder="Bambu Lab" required />
          </LabeledField>
          <LabeledField label="Model">
            <Input name="model" placeholder="A1 Mini" required />
          </LabeledField>
          <LabeledField label="Location">
            <Input name="location" placeholder="Bench location" />
          </LabeledField>
          <LabeledField label="Build volume X">
            <Input name="buildVolumeX" placeholder="180" type="number" required />
          </LabeledField>
          <LabeledField label="Build volume Y">
            <Input name="buildVolumeY" placeholder="180" type="number" required />
          </LabeledField>
          <LabeledField label="Build volume Z">
            <Input name="buildVolumeZ" placeholder="180" type="number" required />
          </LabeledField>
          <LabeledField label="Notes" className="lg:col-span-2">
            <Textarea name="notes" placeholder="Optional workshop notes" />
          </LabeledField>
          <div className="lg:col-span-2">
            <SubmitButton>Add printer</SubmitButton>
          </div>
        </form>
      </QuickAddShell>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Printers in view</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{filtered.length}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Setup gaps</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{setupGaps}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Recent maintenance logs</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {filtered.reduce((sum, printer) => sum + printer.maintenanceLogs.length, 0)}
          </p>
        </div>
      </div>

      <form className="space-y-5">
        <FilterBar>
          <div className="min-w-0 flex-1 sm:min-w-[260px]">
            <label className="mb-2 block text-sm text-slate-500">Search</label>
            <Input name="q" defaultValue={q} placeholder="Search printers, location, or notes" />
          </div>
          <div className="w-full md:w-56">
            <label className="mb-2 block text-sm text-slate-500">Status</label>
            <Select name="status" defaultValue={status}>
              <option value="ACTIVE">Active first</option>
              <option value="ALL">All statuses</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OFFLINE">Offline</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
          </div>
          <SubmitButton variant="secondary">Apply filters</SubmitButton>
        </FilterBar>
      </form>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr] xl:items-start">
        <SectionCard
          title="Fleet list"
          description="Each card surfaces just the current state, installed setup, and any obvious setup gaps."
          className="xl:sticky xl:top-6"
        >
          <div className="space-y-3 xl:max-h-[calc(100vh-14rem)] xl:overflow-y-auto xl:pr-2">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-500">
                No printers match the current filters.
              </div>
            ) : null}

            {filtered.map((printer) => {
              const href = `/printers?selected=${printer.id}#printer-detail`;
              const isSelected = detail?.id === printer.id;
              const hasGap =
                !printer.installedHotendId ||
                !printer.installedPlateId ||
                printer.materialSystems.length === 0;

              return (
                <Link
                  key={printer.id}
                  href={href as Parameters<typeof Link>[0]["href"]}
                  className={cn(
                    "block rounded-[24px] border p-4 transition",
                    isSelected
                      ? "border-slate-900 bg-slate-950 text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={cn("break-words font-medium", isSelected ? "text-white" : "text-slate-950")}>
                        {printer.name}
                      </p>
                      <p className={cn("mt-1 break-words text-sm", isSelected ? "text-white/75" : "text-slate-500")}>
                        {printer.brand} {printer.model} · {printer.location ?? "No location"}
                      </p>
                    </div>
                    <StatusBadge value={printer.status} />
                  </div>
                  <div className={cn("mt-4 grid gap-3 text-sm md:grid-cols-2", isSelected ? "text-white/80" : "text-slate-600")}>
                    <p className="break-words">Hotend: {printer.installedHotend?.name ?? "Unassigned"}</p>
                    <p className="break-words">Plate: {printer.installedPlate?.name ?? "Unassigned"}</p>
                    <p className="break-words md:col-span-2">
                      Material flow: {printer.materialSystems.map((system) => system.name).join(", ") || "No linked material system"}
                    </p>
                  </div>
                  {hasGap ? (
                    <p className={cn("mt-3 text-sm font-medium", isSelected ? "text-amber-200" : "text-amber-700")}>
                      Setup needs attention
                    </p>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </SectionCard>

        <div id="printer-detail">
          <SectionCard title={detail ? detail.name : "Selected printer"} description="Open a printer from the fleet list to see full context, maintenance, and next actions.">
            {detail ? (
              <div className="space-y-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h2 className="break-words text-2xl font-semibold tracking-tight text-slate-950">
                        {detail.name}
                      </h2>
                      <StatusBadge value={detail.status} />
                    </div>
                    <p className="mt-2 break-words text-sm text-slate-500">
                      {detail.brand} {detail.model} · {detail.location ?? "Location not set"} · {detail.buildVolumeX} x {detail.buildVolumeY} x {detail.buildVolumeZ} mm
                    </p>
                    {detail.notes ? (
                      <p className="mt-3 text-sm leading-7 text-slate-600">{detail.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <EditDialog title={`Edit ${detail.name}`} description="Update the core printer record.">
                      <form action={updateInventoryItem} className="grid gap-4 lg:grid-cols-2">
                        <input type="hidden" name="kind" value="printer" />
                        <input type="hidden" name="id" value={detail.id} />
                        <LabeledField label="Name">
                          <Input name="name" defaultValue={detail.name} required />
                        </LabeledField>
                        <LabeledField label="Brand">
                          <Input name="brand" defaultValue={detail.brand} required />
                        </LabeledField>
                        <LabeledField label="Model">
                          <Input name="model" defaultValue={detail.model} required />
                        </LabeledField>
                        <LabeledField label="Location">
                          <Input name="location" defaultValue={detail.location ?? ""} />
                        </LabeledField>
                        <LabeledField label="Status">
                          <Select name="status" defaultValue={detail.status}>
                            <option value="ACTIVE">Active</option>
                            <option value="MAINTENANCE">Maintenance</option>
                            <option value="OFFLINE">Offline</option>
                            <option value="ARCHIVED">Archived</option>
                          </Select>
                        </LabeledField>
                        <div />
                        <LabeledField label="Build volume X">
                          <Input name="buildVolumeX" type="number" defaultValue={detail.buildVolumeX} required />
                        </LabeledField>
                        <LabeledField label="Build volume Y">
                          <Input name="buildVolumeY" type="number" defaultValue={detail.buildVolumeY} required />
                        </LabeledField>
                        <LabeledField label="Build volume Z">
                          <Input name="buildVolumeZ" type="number" defaultValue={detail.buildVolumeZ} required />
                        </LabeledField>
                        <LabeledField label="Notes" className="lg:col-span-2">
                          <Textarea name="notes" defaultValue={detail.notes ?? ""} />
                        </LabeledField>
                        <div className="lg:col-span-2 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                          <p className="text-sm font-medium text-slate-950">Workshop setup assignments</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            Installed hardware, linked material systems, and smart plug assignment are managed from the printer record.
                          </p>
                          <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <LabeledField label="Installed hotend">
                              <Select name="installedHotendId" defaultValue={detail.installedHotend?.id ?? ""}>
                                <option value="">No installed hotend</option>
                                {hotends.map((hotend) => (
                                  <option key={hotend.id} value={hotend.id}>
                                    {hotend.name}
                                  </option>
                                ))}
                              </Select>
                            </LabeledField>
                            <LabeledField label="Installed build plate">
                              <Select name="installedPlateId" defaultValue={detail.installedPlate?.id ?? ""}>
                                <option value="">No installed build plate</option>
                                {buildPlates.map((plate) => (
                                  <option key={plate.id} value={plate.id}>
                                    {plate.name} ({formatBuildPlateSize(plate.sizeMm)})
                                  </option>
                                ))}
                              </Select>
                            </LabeledField>
                            <LabeledField label="Smart plug">
                              <Select name="smartPlugId" defaultValue={detail.smartPlug?.id ?? ""}>
                                <option value="">No smart plug assigned</option>
                                {smartPlugs.map((plug) => (
                                  <option key={plug.id} value={plug.id}>
                                    {plug.name}
                                  </option>
                                ))}
                              </Select>
                            </LabeledField>
                            <div className="grid gap-2 text-sm text-slate-700">
                              <span className="font-medium text-slate-700">Linked material systems</span>
                              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                <div className="space-y-2">
                                  {materialSystems.length > 0 ? (
                                    materialSystems.map((system) => (
                                      <label key={system.id} className="flex items-start gap-2 text-sm text-slate-700">
                                        <input
                                          type="checkbox"
                                          name="materialSystemIds"
                                          value={system.id}
                                          defaultChecked={detail.materialSystems.some((item) => item.id === system.id)}
                                          className="mt-1 rounded"
                                        />
                                        <span>
                                          {system.name}
                                          <span className="ml-1 text-slate-500">({formatMaterialSystemType(system.type)})</span>
                                        </span>
                                      </label>
                                    ))
                                  ) : (
                                    <p className="text-sm text-slate-500">No material systems are available yet.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="lg:col-span-2"><SubmitButton>Save changes</SubmitButton></div>
                      </form>
                    </EditDialog>
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/printers/${detail.slug}`}>Open detail page</Link>
                    </Button>
                    <ArchiveForm id={detail.id} kind="printer" />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Installed hotend</p>
                    <p className="mt-2 font-medium text-slate-950">{detail.installedHotend?.name ?? "Unassigned"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Installed plate</p>
                    <p className="mt-2 font-medium text-slate-950">{detail.installedPlate?.name ?? "Unassigned"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Smart plug</p>
                    <p className="mt-2 font-medium text-slate-950">{detail.smartPlug?.assignedDeviceLabel ?? "No smart plug assigned"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Material systems</p>
                    <p className="mt-2 font-medium text-slate-950">
                      {detail.materialSystems.map((system) => system.name).join(", ") || "No material systems linked"}
                    </p>
                  </div>
                </div>

                <details className="rounded-[24px] border border-slate-200 bg-white">
                  <summary className="cursor-pointer list-none px-4 py-4 font-medium text-slate-950">
                    Maintenance and compatibility detail
                  </summary>
                  <div className="grid gap-4 border-t border-slate-100 p-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-950">Recent maintenance</p>
                      <div className="mt-3 space-y-3 text-sm text-slate-600">
                        {detail.maintenanceLogs.length > 0 ? (
                          detail.maintenanceLogs.map((log) => (
                            <div key={log.id}>
                              <p>{log.actionPerformed}</p>
                              <p className="mt-1 text-slate-500">{new Date(log.date).toLocaleDateString()}</p>
                            </div>
                          ))
                        ) : (
                          <p>No maintenance logs yet.</p>
                        )}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-950">Compatibility coverage</p>
                      <div className="mt-3 space-y-3 text-sm text-slate-600">
                        <p>{detail.installedPlate ? "Installed plate confirmed in compatibility set." : "No installed plate selected."}</p>
                        <p>{detail.installedHotend ? "Installed hotend confirmed in compatibility set." : "No installed hotend selected."}</p>
                        <p>{detail.materialSystems.length > 0 ? "Material path available for this printer." : "No linked material path."}</p>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-500">
                No printer matches the current filters.
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
