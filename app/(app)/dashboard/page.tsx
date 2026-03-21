import Link from "next/link";
import type { Route } from "next";
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
  const hasInventory =
    data.totals.totalPrinters > 0 ||
    data.totals.totalFilamentSpools > 0 ||
    data.inventoryByCategory.some((item) => item.value > 0);
  const attentionItems = [...data.lowStockFilament, ...data.lowStockConsumables].slice(0, 8);

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#e2e8f0_100%)] p-0">
        <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:p-8">
          <PageHeader
            eyebrow="Workshop Overview"
            title="Control the room, not just the printer queue"
            description="Makerventory keeps machines, material flow, maintenance, safety, and purchase planning visible in one operational dashboard."
            action={
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild className="!text-white [&_svg]:!text-white">
                  <Link href="/filament">
                    Review filament risk
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="secondary"
                  className="!text-slate-700 [&_svg]:!text-slate-700"
                >
                  <Link href={hasInventory ? "/maintenance" : "/account"}>
                    {hasInventory ? "Log maintenance" : "Set up account"}
                  </Link>
                </Button>
              </div>
            }
          />

          <div className="min-w-0 rounded-[28px] border border-slate-200 bg-slate-950 p-4 text-white sm:p-5">
            <p className="text-sm text-slate-400">Quick workshop state</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-300">Active printers</p>
                  <StatusBadge
                    value={
                      data.totals.totalPrinters > 0 &&
                      data.totals.activePrinters === data.totals.totalPrinters
                        ? "ACTIVE"
                        : "MAINTENANCE"
                    }
                  />
                </div>
                <p className="mt-3 break-words text-3xl font-semibold">
                  {data.totals.activePrinters}/{data.totals.totalPrinters}
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <TriangleAlert className="h-4 w-4 text-amber-300" />
                  Needs attention
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-100">
                  {hasInventory
                    ? `${data.lowStockConsumables.length} consumables and ${data.lowStockFilament.length} filament entries need restock or handling attention.`
                    : "No inventory is tracked yet. Add your first records or import your existing data to populate the dashboard."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {!hasInventory ? (
        <SectionCard
          title="Start your workspace"
          description="This workspace is empty by design. Makerventory no longer injects demo inventory, so the next step is to enter or import your real setup."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Create your printer fleet",
                body: "Add your first machine so compatibility, maintenance, and installed hardware can be tracked.",
                href: "/printers" as Route,
              },
              {
                title: "Import existing stock",
                body: "Use staged CSV imports to bring in filament, consumables, tools, and wishlist records safely.",
                href: "/imports" as Route,
              },
              {
                title: "Set your workspace identity",
                body: "Adjust your account profile and workspace name before sharing screenshots or building out operations.",
                href: "/account" as Route,
              },
              {
                title: "Add initial material data",
                body: "Start with filament and consumables to unlock low-stock alerts and handling workflows.",
                href: "/filament" as Route,
              },
            ].map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition hover:border-slate-300 hover:bg-white"
              >
                <p className="font-medium text-slate-950">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
              </Link>
            ))}
          </div>
        </SectionCard>
      ) : null}

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
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 break-words pr-2 text-slate-600">
                    {item.label}
                  </span>
                  <span className="shrink-0 font-medium text-slate-950">{item.value}</span>
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
            {data.filamentByMaterial.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-500">
                No filament data yet. Add stock manually or import it from your own spreadsheet.
              </div>
            ) : (
              data.filamentByMaterial.map((item) => (
                <div
                  key={item.materialType}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="break-words font-medium text-slate-950">{item.materialType}</p>
                    <p className="text-sm text-slate-500">Material group coverage</p>
                  </div>
                  <p className="shrink-0 text-xl font-semibold text-slate-950">
                    {item._sum.quantity ?? 0}
                  </p>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="Low Stock / Needs Reorder"
          description="Materials and support supplies that should be reviewed before the next busy run."
        >
          <div className="space-y-3">
            {attentionItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-500">
                No low-stock alerts right now. This section will populate once you start tracking materials and consumables.
              </div>
            ) : (
              attentionItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="break-words font-medium text-slate-950">
                      {"materialType" in item
                        ? `${item.brand} ${item.color} ${item.materialType}`
                        : item.name}
                    </p>
                    <p className="mt-1 break-words text-sm text-slate-500">
                      {"materialType" in item
                        ? `${item.quantity} spool(s) · ${formatRelativeStock(item.estimatedRemainingGrams)} remaining`
                        : `${item.quantity.toString()} ${item.unit} on hand`}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge value={item.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Wishlist Priorities"
          description="See where upcoming purchasing demand is concentrated across your own open wishlist."
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
                  <p className="mt-2 break-words text-sm text-slate-500">
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
            {data.recentMaintenance.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-500">
                No maintenance events logged yet. Use the maintenance page to start tracking service history.
              </div>
            ) : (
              data.recentMaintenance.map((log) => {
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
                      <p className="break-words font-medium text-slate-950">{log.actionPerformed}</p>
                      <div className="shrink-0">
                        <StatusBadge value={log.actionType} />
                      </div>
                    </div>
                    <p className="mt-2 break-words text-sm text-slate-600">{asset}</p>
                    {log.notes ? (
                      <p className="mt-2 break-words text-sm leading-6 text-slate-500">
                        {log.notes}
                      </p>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Currently In Use"
          description="Installed components and assigned systems per printer."
        >
          <div className="space-y-3">
            {data.printers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-500">
                No printers added yet. Add your first machine to start linking active hotends, plates, and material systems.
              </div>
            ) : (
              data.printers.map((printer) => (
                <div
                  key={printer.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="break-words font-medium text-slate-950">{printer.name}</p>
                    <div className="shrink-0">
                      <StatusBadge value={printer.status} />
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p className="break-words">
                      Hotend: {printer.installedHotend?.name ?? "Unassigned"}
                    </p>
                    <p className="break-words">
                      Plate: {printer.installedPlate?.name ?? "Unassigned"}
                    </p>
                    <p className="break-words">
                      Material flow:{" "}
                      {printer.materialSystems.map((system) => system.name).join(", ") ||
                        "No linked system"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Compatibility Insights"
          description="General compatibility reminders based on your tracked printer, plate, hotend, and filament data."
        >
          <div className="space-y-3 text-sm leading-6 text-slate-600">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 font-medium text-slate-950">
                <Wrench className="h-4 w-4" />
                Abrasive workflow
              </div>
              <p className="mt-2">
                Abrasive materials should stay on hardened steel hotends, and fiber-filled stock should be reviewed before long print runs.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 font-medium text-slate-950">
                <ShieldCheck className="h-4 w-4" />
                Moisture-sensitive stock
              </div>
              <p className="mt-2">
                Hygroscopic or drying-sensitive stock should be reviewed for dryer or desiccant attention before long jobs.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 font-medium text-slate-950">
                <TriangleAlert className="h-4 w-4" />
                Plate family fit
              </div>
              <p className="mt-2">
                Plate size and hotend families should only be assigned to printers with confirmed compatibility entries.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
