import Link from "next/link";
import { createInventoryItem, updateInventoryItem } from "@/app/actions";
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
import { getPrinters } from "@/lib/data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PrintersPage(props: { searchParams?: SearchParams }) {
  const searchParams = (await props.searchParams) ?? {};
  const q = typeof searchParams.q === "string" ? searchParams.q.toLowerCase() : "";
  const status = typeof searchParams.status === "string" ? searchParams.status : "ALL";
  const selected = typeof searchParams.selected === "string" ? searchParams.selected : "";
  const printers = await getPrinters();

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

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Fleet"
        title="Printers"
        description="Track machine state, installed components, power assignment, and recent maintenance in one fleet view."
      />

      <QuickAddShell
        title="Add printer"
        description="Create a new printer record with the minimum data needed to bring it into the operational view."
      >
        <form action={createInventoryItem} className="grid gap-4 lg:grid-cols-2">
          <input type="hidden" name="kind" value="printer" />
          <Input name="name" placeholder="Printer name" required />
          <Input name="brand" placeholder="Brand" required />
          <Input name="model" placeholder="Model" required />
          <Input name="location" placeholder="Location" />
          <Input name="buildVolumeX" placeholder="Build volume X" type="number" required />
          <Input name="buildVolumeY" placeholder="Build volume Y" type="number" required />
          <Input name="buildVolumeZ" placeholder="Build volume Z" type="number" required />
          <Textarea name="notes" placeholder="Notes" className="lg:col-span-2" />
          <div className="lg:col-span-2">
            <SubmitButton>Add printer</SubmitButton>
          </div>
        </form>
      </QuickAddShell>

      <form className="space-y-5">
        <FilterBar>
          <div className="min-w-0 flex-1 sm:min-w-[260px]">
            <label className="mb-2 block text-sm text-slate-500">Search</label>
            <Input name="q" defaultValue={q} placeholder="Search printers, location, or notes" />
          </div>
          <div className="w-full md:w-56">
            <label className="mb-2 block text-sm text-slate-500">Status</label>
            <Select name="status" defaultValue={status}>
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OFFLINE">Offline</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
          </div>
          <SubmitButton variant="secondary">Apply filters</SubmitButton>
        </FilterBar>
      </form>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Printer inventory" description={`${filtered.length} printer records in view.`}>
          <div className="overflow-x-auto rounded-[24px] border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Printer</th>
                  <th className="px-4 py-3 font-medium">Installed setup</th>
                  <th className="px-4 py-3 font-medium">Power / AMS</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((printer) => (
                  <tr key={printer.id} className="align-top">
                    <td className="px-4 py-4">
                      <Link
                        href={`/printers?selected=${printer.id}`}
                        className="font-medium text-slate-950 hover:text-blue-700"
                      >
                        {printer.name}
                      </Link>
                      <p className="mt-1 text-slate-500">
                        {printer.brand} {printer.model} · {printer.buildVolumeX} x {printer.buildVolumeY} x {printer.buildVolumeZ}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <p>{printer.installedHotend?.name ?? "No hotend assigned"}</p>
                      <p className="mt-1">{printer.installedPlate?.name ?? "No plate assigned"}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <p>{printer.smartPlug?.name ?? "No smart plug"}</p>
                      <p className="mt-1">
                        {printer.materialSystems.map((system) => system.name).join(", ") || "No linked material system"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge value={printer.status} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <EditDialog
                          title={`Edit ${printer.name}`}
                          description="Update the core printer record."
                        >
                          <form action={updateInventoryItem} className="grid gap-4 lg:grid-cols-2">
                            <input type="hidden" name="kind" value="printer" />
                            <input type="hidden" name="id" value={printer.id} />
                            <Input name="name" defaultValue={printer.name} required />
                            <Input name="brand" defaultValue={printer.brand} required />
                            <Input name="model" defaultValue={printer.model} required />
                            <Input name="location" defaultValue={printer.location ?? ""} />
                            <Select name="status" defaultValue={printer.status}>
                              <option value="ACTIVE">Active</option>
                              <option value="MAINTENANCE">Maintenance</option>
                              <option value="OFFLINE">Offline</option>
                              <option value="ARCHIVED">Archived</option>
                            </Select>
                            <div />
                            <Input name="buildVolumeX" type="number" defaultValue={printer.buildVolumeX} required />
                            <Input name="buildVolumeY" type="number" defaultValue={printer.buildVolumeY} required />
                            <Input name="buildVolumeZ" type="number" defaultValue={printer.buildVolumeZ} required />
                            <Textarea name="notes" defaultValue={printer.notes ?? ""} className="lg:col-span-2" />
                            <div className="lg:col-span-2"><SubmitButton>Save changes</SubmitButton></div>
                          </form>
                        </EditDialog>
                        <Link href={`/printers/${printer.slug}`} className="text-sm font-medium text-slate-700 hover:text-slate-950">
                          Details
                        </Link>
                        <ArchiveForm id={printer.id} kind="printer" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Selected printer" description="Operational context, current setup, and recent service activity.">
          {detail ? (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                    {detail.name}
                  </h2>
                  <StatusBadge value={detail.status} />
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {detail.location ?? "Location not set"} · {detail.buildVolumeX} x {detail.buildVolumeY} x {detail.buildVolumeZ} mm
                </p>
                {detail.notes ? (
                  <p className="mt-3 text-sm leading-7 text-slate-600">{detail.notes}</p>
                ) : null}
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

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-950">Recent maintenance</p>
                  <div className="mt-3 space-y-3 text-sm text-slate-600">
                    {detail.maintenanceLogs.map((log) => (
                      <div key={log.id}>
                        <p>{log.actionPerformed}</p>
                        <p className="mt-1 text-slate-500">{new Date(log.date).toLocaleDateString()}</p>
                      </div>
                    ))}
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

              <div className="flex gap-3">
                <Link href={`/printers/${detail.slug}`} className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white">
                  Open detail page
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No printer matches the current filters.</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
