import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getPrinterBySlug } from "@/lib/data";

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
        <Link href="/printers" className="text-sm text-slate-500 hover:text-slate-950">
          Back to printers
        </Link>
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
        <SectionCard title="Core printer info" description="Installed hardware, location, and linked controls.">
          <div className="grid gap-4 md:grid-cols-2">
            <Info label="Brand / model" value={`${printer.brand} ${printer.model}`} />
            <Info label="Build volume" value={`${printer.buildVolumeX} x ${printer.buildVolumeY} x ${printer.buildVolumeZ} mm`} />
            <Info label="Location" value={printer.location ?? "Unset"} />
            <Info label="Smart plug" value={printer.smartPlug?.name ?? "Not assigned"} />
            <Info label="Installed nozzle" value={printer.installedHotend?.name ?? "Not assigned"} />
            <Info label="Installed plate" value={printer.installedPlate?.name ?? "Not assigned"} />
            <Info
              label="Linked material systems"
              value={printer.materialSystems.map((system) => system.name).join(", ") || "No linked systems"}
            />
          </div>
        </SectionCard>

        <SectionCard title="Maintenance history" description="Recent work performed on this machine.">
          <div className="space-y-3">
            {printer.maintenanceLogs.map((log) => (
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
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard title="Compatible plates" description="Valid build plates for this machine.">
          <List values={printer.compatiblePlates.map((item) => item.buildPlate.name)} />
        </SectionCard>
        <SectionCard title="Compatible hotends" description="Hotends safe to install on this machine.">
          <List values={printer.compatibleHotends.map((item) => item.hotend.name)} />
        </SectionCard>
        <SectionCard title="Compatible material systems" description="Linked and supported material flow hardware.">
          <List values={printer.compatibleMaterialSystems.map((item) => item.materialSystem.name)} />
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
      {values.map((value) => (
        <div key={value} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {value}
        </div>
      ))}
    </div>
  );
}
