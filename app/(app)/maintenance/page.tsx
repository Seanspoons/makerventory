import { createMaintenanceLog } from "@/app/actions";
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
import { getBuildPlates, getHotends, getMaintenanceLogs, getMaterialSystems, getPrinters, getSafetyEquipment } from "@/lib/data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MaintenancePage(props: { searchParams?: SearchParams }) {
  const searchParams = (await props.searchParams) ?? {};
  const q = typeof searchParams.q === "string" ? searchParams.q.toLowerCase() : "";
  const action = typeof searchParams.action === "string" ? searchParams.action : "ALL";
  const logs = await getMaintenanceLogs();
  const [printers, materialSystems, buildPlates, hotends, safety] = await Promise.all([
    getPrinters(),
    getMaterialSystems(),
    getBuildPlates(),
    getHotends(),
    getSafetyEquipment(),
  ]);

  const filtered = logs.filter((log) => {
    const asset =
      log.printer?.name ??
      log.materialSystem?.name ??
      log.buildPlate?.name ??
      log.hotend?.name ??
      log.safetyEquipment?.name ??
      "";
    const haystack = [log.actionPerformed, log.notes ?? "", asset].join(" ").toLowerCase();
    return (q ? haystack.includes(q) : true) && (action === "ALL" ? true : log.actionType === action);
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Service"
        title="Maintenance Logs"
        description="Record nozzle swaps, lubrication, desiccant refreshes, and exhaust work against the actual assets they affect."
      />

      <QuickAddShell
        title="Log maintenance"
        description="Capture the action, date, and linked asset so the service history remains useful later."
      >
        <form action={createMaintenanceLog} className="grid gap-4 lg:grid-cols-3">
          <Input type="date" name="date" required />
          <Select name="actionType" defaultValue="INSPECTION">
            <option value="NOZZLE_SWAP">Nozzle swap</option>
            <option value="LUBRICATION">Lubrication</option>
            <option value="BED_CLEANING">Bed cleaning</option>
            <option value="WIPER_REPLACEMENT">Wiper replacement</option>
            <option value="PTFE_REPLACEMENT">PTFE replacement</option>
            <option value="DESICCANT_REFRESH">Desiccant refresh</option>
            <option value="EXHAUST_UPDATE">Exhaust update</option>
            <option value="INSPECTION">Inspection</option>
            <option value="OTHER">Other</option>
          </Select>
          <Input name="actionPerformed" placeholder="Action performed" required />
          <Select name="assetType" defaultValue="printer">
            <option value="printer">Printer</option>
            <option value="materialSystem">Material system</option>
            <option value="buildPlate">Build plate</option>
            <option value="hotend">Hotend</option>
            <option value="safety">Safety equipment</option>
          </Select>
          <Select name="assetId" defaultValue={printers[0]?.id}>
            {[...printers.map((item) => ({ value: item.id, label: item.name })), ...materialSystems.map((item) => ({ value: item.id, label: item.name })), ...buildPlates.map((item) => ({ value: item.id, label: item.name })), ...hotends.map((item) => ({ value: item.id, label: item.name })), ...safety.map((item) => ({ value: item.id, label: item.name }))].map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <div />
          <Textarea name="notes" placeholder="Notes" className="lg:col-span-3" />
          <div className="lg:col-span-3">
            <SubmitButton>Log maintenance</SubmitButton>
          </div>
        </form>
      </QuickAddShell>

      <form className="space-y-5">
        <FilterBar>
          <div className="min-w-[220px] flex-1">
            <label className="mb-2 block text-sm text-slate-500">Search</label>
            <Input name="q" defaultValue={q} placeholder="Search action, notes, or asset" />
          </div>
          <div className="w-full md:w-56">
            <label className="mb-2 block text-sm text-slate-500">Action</label>
            <Select name="action" defaultValue={action}>
              <option value="ALL">All actions</option>
              <option value="NOZZLE_SWAP">Nozzle swap</option>
              <option value="LUBRICATION">Lubrication</option>
              <option value="BED_CLEANING">Bed cleaning</option>
              <option value="WIPER_REPLACEMENT">Wiper replacement</option>
              <option value="PTFE_REPLACEMENT">PTFE replacement</option>
              <option value="DESICCANT_REFRESH">Desiccant refresh</option>
              <option value="EXHAUST_UPDATE">Exhaust update</option>
              <option value="INSPECTION">Inspection</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>
          <SubmitButton variant="secondary">Apply filters</SubmitButton>
        </FilterBar>
      </form>

      <SectionCard title="Maintenance history" description={`${filtered.length} records shown.`}>
        <div className="space-y-3">
          {filtered.map((log) => {
            const asset =
              log.printer?.name ??
              log.materialSystem?.name ??
              log.buildPlate?.name ??
              log.hotend?.name ??
              log.safetyEquipment?.name ??
              "Workshop asset";
            return (
              <div key={log.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-950">{log.actionPerformed}</p>
                      <StatusBadge value={log.actionType} />
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {new Date(log.date).toLocaleDateString()} · {asset}
                    </p>
                    {log.notes ? <p className="mt-2 text-sm leading-6 text-slate-600">{log.notes}</p> : null}
                    {log.consumablesUsed.length > 0 ? (
                      <p className="mt-2 text-sm text-slate-500">
                        Consumables: {log.consumablesUsed.map((usage) => `${usage.consumableItem.name} (${usage.quantityUsed.toString()} ${usage.unit})`).join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <ArchiveForm id={log.id} kind="maintenance" label="Void log" />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
