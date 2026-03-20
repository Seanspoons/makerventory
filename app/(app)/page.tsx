import Link from "next/link";
import { ArrowRight, ShieldCheck, TriangleAlert, Wrench } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDashboardData } from "@/lib/data";
import { formatRelativeStock, titleCase } from "@/lib/utils";

export default async function HomePage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#e2e8f0_100%)] p-0">
        <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-8">
          <PageHeader
            eyebrow="Workshop Overview"
            title="Control the room, not just the printer queue"
            description="Makerventory keeps machines, material flow, maintenance, safety, and purchase planning visible in one operational dashboard."
            action={
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/filament" className="text-white">
                    Review filament risk
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/maintenance" className="text-slate-700">
                    Log maintenance
                  </Link>
                </Button>
              </div>
            }
          />

          <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white">
            <p className="text-sm text-slate-400">Quick workshop state</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-300">Active printers</p>
                  <StatusBadge
                    value={
                      data.totals.activePrinters === data.totals.totalPrinters
                        ? "ACTIVE"
                        : "MAINTENANCE"
                    }
                  />
                </div>
                <p className="mt-3 text-3xl font-semibold">
                  {data.totals.activePrinters}/{data.totals.totalPrinters}
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <TriangleAlert className="h-4 w-4 text-amber-300" />
                  Needs attention
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-100">
                  {data.lowStockConsumables.length} consumables and{" "}
                  {data.lowStockFilament.length} filament entries need restock or
                  handling attention.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          label="Total Printers"
          value={data.totals.totalPrinters}
          helper="Installed fleet across the bench."
        />
        <MetricCard
          label="Active Printers"
          value={data.totals.activePrinters}
          helper="Machines ready for immediate print work."
        />
        <MetricCard
          label="Total Spools"
          value={data.totals.totalFilamentSpools}
          helper="Aggregate spool count across stocked materials."
        />
        <MetricCard
          label="Low Stock"
          value={data.totals.lowStockItems}
          helper="Filament or consumables needing review."
        />
        <MetricCard
          label="Wishlist Items"
          value={data.totals.wishlistCount}
          helper="Open purchase planning items."
        />
        <MetricCard
          label="30-Day Maintenance"
          value={data.totals.maintenanceCount}
          helper="Recent service actions logged this month."
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <SectionCard
          title="Inventory by Category"
          description="A quick sizing view of the workshop footprint across machines, supplies, and support gear."
        >
          <div className="space-y-4">
            {data.inventoryByCategory.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-600">{item.label}</span>
                  <span className="font-medium text-slate-950">{item.value}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-slate-950"
                    style={{
                      width: `${Math.max(12, (item.value / 24) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Filament by Material"
          description="Stock concentration by printable material family."
        >
          <div className="space-y-3">
            {data.filamentByMaterial.map((item) => (
              <div
                key={item.materialType}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-950">{item.materialType}</p>
                  <p className="text-sm text-slate-500">Material group coverage</p>
                </div>
                <p className="text-xl font-semibold text-slate-950">
                  {item._sum.quantity ?? 0}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="Low Stock / Needs Reorder"
          description="Materials and support supplies that should be reviewed before the next busy run."
        >
          <div className="space-y-3">
            {[...data.lowStockFilament, ...data.lowStockConsumables]
              .slice(0, 8)
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-950">
                      {"materialType" in item
                        ? `${item.brand} ${item.color} ${item.materialType}`
                        : item.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {"materialType" in item
                        ? `${item.quantity} spool(s) · ${formatRelativeStock(item.estimatedRemainingGrams)} remaining`
                        : `${item.quantity.toString()} ${item.unit} on hand`}
                    </p>
                  </div>
                  <StatusBadge value={item.status} />
                </div>
              ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Wishlist Priorities"
          description="Purchase pressure is concentrated around finishing the exhaust path and strengthening the workspace."
        >
          <div className="grid gap-3 md:grid-cols-2">
            {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((priority) => {
              const match = data.wishlistByPriority.find(
                (item) => item.priority === priority,
              );
              return (
                <div
                  key={priority}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <StatusBadge value={priority} />
                  <p className="mt-4 text-3xl font-semibold text-slate-950">
                    {match?._count._all ?? 0}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {titleCase(priority)} priority items not yet purchased
                  </p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[1fr_1fr_1fr]">
        <SectionCard
          title="Recent Maintenance"
          description="Operational history across printers, material systems, and safety equipment."
        >
          <div className="space-y-3">
            {data.recentMaintenance.map((log) => {
              const asset =
                log.printer?.name ??
                log.materialSystem?.name ??
                log.buildPlate?.name ??
                log.hotend?.name ??
                log.safetyEquipment?.name ??
                "Workshop asset";
              return (
                <div
                  key={log.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-950">{log.actionPerformed}</p>
                    <StatusBadge value={log.actionType} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{asset}</p>
                  {log.notes ? (
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {log.notes}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="Currently In Use"
          description="Installed components and assigned systems per printer."
        >
          <div className="space-y-3">
            {data.printers.map((printer) => (
              <div
                key={printer.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-950">{printer.name}</p>
                  <StatusBadge value={printer.status} />
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>Hotend: {printer.installedHotend?.name ?? "Unassigned"}</p>
                  <p>Plate: {printer.installedPlate?.name ?? "Unassigned"}</p>
                  <p>
                    Material flow:{" "}
                    {printer.materialSystems.map((system) => system.name).join(", ") ||
                      "No linked system"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Compatibility Insights"
          description="Practical reminders surfaced from the seeded setup."
        >
          <div className="space-y-3 text-sm leading-6 text-slate-600">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 font-medium text-slate-950">
                <Wrench className="h-4 w-4" />
                Abrasive workflow
              </div>
              <p className="mt-2">
                PETG-CF stock should stay on hardened steel hotends. The A1 Mini
                and P2S are both seeded with compatible hardened options.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 font-medium text-slate-950">
                <ShieldCheck className="h-4 w-4" />
                Moisture-sensitive stock
              </div>
              <p className="mt-2">
                TPU, PETG-CF, and opened ASA entries should be prioritized for
                dryer or desiccant attention before long jobs.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 font-medium text-slate-950">
                <TriangleAlert className="h-4 w-4" />
                Plate family fit
              </div>
              <p className="mt-2">
                180mm plates are only compatible with the A1 Mini. 256mm plates are
                only compatible with the P2S.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
