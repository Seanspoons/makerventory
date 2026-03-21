import { createMaintenanceLog } from "@/app/actions";
import { LabeledField } from "@/components/forms/labeled-field";
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
  const selected = typeof searchParams.selected === "string" ? searchParams.selected : "";
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
  const detail = filtered.find((log) => log.id === selected) ?? filtered[0] ?? null;

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
          <LabeledField label="Date">
            <Input type="date" name="date" required />
          </LabeledField>
          <LabeledField label="Action type">
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
          </LabeledField>
          <LabeledField label="Action performed">
            <Input name="actionPerformed" placeholder="Lubricated X axis" required />
          </LabeledField>
          <LabeledField label="Asset type">
            <Select name="assetType" defaultValue="printer">
              <option value="printer">Printer</option>
              <option value="materialSystem">Material system</option>
              <option value="buildPlate">Build plate</option>
              <option value="hotend">Hotend</option>
              <option value="safety">Safety equipment</option>
            </Select>
          </LabeledField>
          <LabeledField label="Asset">
            <Select name="assetId" defaultValue={printers[0]?.id}>
              {[...printers.map((item) => ({ value: item.id, label: item.name })), ...materialSystems.map((item) => ({ value: item.id, label: item.name })), ...buildPlates.map((item) => ({ value: item.id, label: item.name })), ...hotends.map((item) => ({ value: item.id, label: item.name })), ...safety.map((item) => ({ value: item.id, label: item.name }))].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </LabeledField>
          <div />
          <LabeledField label="Notes" className="lg:col-span-3">
            <Textarea name="notes" placeholder="What was done and why" />
          </LabeledField>
          <div className="lg:col-span-3">
            <SubmitButton>Log maintenance</SubmitButton>
          </div>
        </form>
      </QuickAddShell>

      <form className="space-y-5">
        <FilterBar>
          <div className="min-w-0 flex-1 sm:min-w-[220px]">
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

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Logs in view</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{filtered.length}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Recent 30 days</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {filtered.filter((log) => Date.now() - new Date(log.date).getTime() <= 1000 * 60 * 60 * 24 * 30).length}
          </p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">With consumables</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {filtered.filter((log) => log.consumablesUsed.length > 0).length}
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
        <SectionCard
          title="Maintenance history"
          description="Scan date, action type, and linked asset first, then open a log when you need context."
          className="xl:sticky xl:top-6"
        >
          <div className="space-y-3 xl:max-h-[calc(100vh-14rem)] xl:overflow-y-auto xl:pr-2">
            {filtered.map((log) => {
              const asset =
                log.printer?.name ??
                log.materialSystem?.name ??
                log.buildPlate?.name ??
                log.hotend?.name ??
                log.safetyEquipment?.name ??
                "Workshop asset";
              const href = `/maintenance?selected=${log.id}${action !== "ALL" ? `&action=${action}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
              const isSelected = detail?.id === log.id;
              return (
                <a
                  key={log.id}
                  href={href}
                  className={`block rounded-[24px] border p-4 transition ${
                    isSelected
                      ? "border-slate-900 bg-slate-950 text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`break-words font-medium ${isSelected ? "text-white" : "text-slate-950"}`}>{log.actionPerformed}</p>
                      <p className={`mt-1 break-words text-sm ${isSelected ? "text-white/75" : "text-slate-500"}`}>
                        {new Date(log.date).toLocaleDateString()} · {asset}
                      </p>
                    </div>
                    <StatusBadge value={log.actionType} />
                  </div>
                </a>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title={detail ? detail.actionPerformed : "Selected maintenance log"}
          description="Notes, consumables used, and quieter destructive actions stay in the detail pane."
        >
          {detail ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="break-words text-2xl font-semibold tracking-tight text-slate-950">{detail.actionPerformed}</h2>
                    <StatusBadge value={detail.actionType} />
                  </div>
                  <p className="mt-2 break-words text-sm text-slate-500">
                    {new Date(detail.date).toLocaleDateString()} ·{" "}
                    {detail.printer?.name ??
                      detail.materialSystem?.name ??
                      detail.buildPlate?.name ??
                      detail.hotend?.name ??
                      detail.safetyEquipment?.name ??
                      "Workshop asset"}
                  </p>
                </div>
                <ArchiveForm id={detail.id} kind="maintenance" label="Void log" triggerVariant="secondary" />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Action type</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{detail.actionType.replaceAll("_", " ")}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Consumables used</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {detail.consumablesUsed.length > 0 ? detail.consumablesUsed.length : "None"}
                  </p>
                </div>
              </div>

              <details className="rounded-[24px] border border-slate-200 bg-white" open={Boolean(detail.notes)}>
                <summary className="cursor-pointer list-none px-4 py-4 font-medium text-slate-950">
                  Notes and consumables detail
                </summary>
                <div className="space-y-4 border-t border-slate-100 p-4 text-sm leading-7 text-slate-600">
                  <p>{detail.notes ?? "No additional notes recorded."}</p>
                  {detail.consumablesUsed.length > 0 ? (
                    <div>
                      <p className="font-medium text-slate-950">Consumables used</p>
                      <p className="mt-2">
                        {detail.consumablesUsed
                          .map((usage) => `${usage.consumableItem.name} (${usage.quantityUsed.toString()} ${usage.unit})`)
                          .join(", ")}
                      </p>
                    </div>
                  ) : null}
                </div>
              </details>
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-500">
              No maintenance logs match the current filters.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
