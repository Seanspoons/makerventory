import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getPrinterBySlug } from "@/lib/data";
import { formatBuildPlateSize, formatMaterialSystemType } from "@/lib/utils";

export default async function PrinterDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const printer = await getPrinterBySlug(slug);

  if (!printer) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/printers" className="text-sm text-slate-500 hover:text-slate-950">
            Back to printers
          </Link>
          <Link
            href={`/printers?selected=${printer.id}`}
            className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
          >
            Manage setup
          </Link>
        </div>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Printer Detail
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              {printer.name}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              {printer.notes ?? "No operating notes recorded yet."}
            </p>
          </div>
          <StatusBadge value={printer.status} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title="Overview" description="Current workshop state for this printer, with setup management grouped in one predictable place.">
          <div className="grid gap-4 md:grid-cols-2">
            <Info label="Brand / model" value={`${printer.brand} ${printer.model}`} />
            <Info label="Build volume" value={`${printer.buildVolumeX} x ${printer.buildVolumeY} x ${printer.buildVolumeZ} mm`} />
            <Info label="Location" value={printer.location ?? "Unset"} />
            <Info label="Setup gaps" value={printer.installedHotend && printer.installedPlate ? "Fully configured" : "Needs hardware assignment"} />
          </div>
        </SectionCard>

        <SectionCard title="Current assignments" description="Installed hardware and linked controls are shown together so setup state reads clearly at a glance.">
          <div className="grid gap-4 md:grid-cols-2">
            <Info label="Smart plug" value={printer.smartPlug?.name ?? "Not assigned"} />
            <Info label="Installed hotend" value={printer.installedHotend?.name ?? "Not assigned"} />
            <Info
              label="Installed build plate"
              value={
                printer.installedPlate
                  ? `${printer.installedPlate.name} · ${formatBuildPlateSize(printer.installedPlate.sizeMm)}`
                  : "Not assigned"
              }
            />
            <Info
              label="Linked material systems"
              value={
                printer.materialSystems.map((system) => `${system.name} (${formatMaterialSystemType(system.type)})`).join(", ") ||
                "No linked systems"
              }
            />
          </div>
          <details className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50/70">
            <summary className="cursor-pointer list-none px-4 py-3 font-medium text-slate-950">
              Compatibility reference
            </summary>
            <div className="grid gap-4 border-t border-slate-200 p-4 lg:grid-cols-3">
              <div>
                <p className="mb-3 text-sm font-medium text-slate-950">Build plates</p>
                <List
                  values={printer.compatiblePlates.map(
                    (item) => `${item.buildPlate.name} · ${formatBuildPlateSize(item.buildPlate.sizeMm)}`,
                  )}
                />
              </div>
              <div>
                <p className="mb-3 text-sm font-medium text-slate-950">Hotends</p>
                <List values={printer.compatibleHotends.map((item) => item.hotend.name)} />
              </div>
              <div>
                <p className="mb-3 text-sm font-medium text-slate-950">Material systems</p>
                <List
                  values={printer.compatibleMaterialSystems.map(
                    (item) => `${item.materialSystem.name} (${formatMaterialSystemType(item.materialSystem.type)})`,
                  )}
                />
              </div>
            </div>
          </details>
        </SectionCard>

        <SectionCard title="Maintenance history" description="Recent work performed on this machine.">
          <div className="space-y-3">
            {printer.maintenanceLogs.length > 0 ? (
              printer.maintenanceLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-950">{log.actionPerformed}</p>
                    <StatusBadge value={log.actionType} />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {new Date(log.date).toLocaleDateString()}
                  </p>
                  {log.notes ? <p className="mt-2 text-sm leading-6 text-slate-600">{log.notes}</p> : null}
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-500">
                No maintenance has been logged for this printer yet.
              </div>
            )}
          </div>
        </SectionCard>
      </div>

    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 font-medium text-slate-950">{value}</p>
    </div>
  );
}

function List({ values }: { values: string[] }) {
  return (
    <div className="space-y-3">
      {values.length > 0 ? (
        values.map((value) => (
          <div key={value} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {value}
          </div>
        ))
      ) : (
        <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-500">
          Nothing has been configured here yet.
        </div>
      )}
    </div>
  );
}
