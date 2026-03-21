import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, CircleAlert, PackagePlus, ShoppingCart, Upload, Wrench } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDashboardData } from "@/lib/data";
import { formatRelativeStock, titleCase } from "@/lib/utils";

function attentionTone(kind: "warning" | "neutral" | "action") {
  if (kind === "warning") {
    return "border-amber-200 bg-amber-50/80";
  }
  if (kind === "action") {
    return "border-slate-900 bg-slate-950 text-white";
  }
  return "border-slate-200 bg-white";
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const hasInventory = data.onboardingState.hasInventory;
  const attentionCards = [
    {
      title: "Low stock",
      value: data.totals.lowStockItems,
      body:
        data.totals.lowStockItems > 0
          ? "Filament or consumables need restock review."
          : "No stock alerts are active right now.",
      href: "/filament" as Route,
      cta: "Review stock",
      kind: data.totals.lowStockItems > 0 ? "warning" : "neutral",
    },
    {
      title: "Maintenance due",
      value: data.setupSummary.maintenanceAttention,
      body:
        data.setupSummary.maintenanceAttention > 0
          ? "Printers are missing recent maintenance coverage."
          : "Recent maintenance coverage looks healthy.",
      href: "/maintenance" as Route,
      cta: "Open maintenance",
      kind: data.setupSummary.maintenanceAttention > 0 ? "warning" : "neutral",
    },
    {
      title: "Unresolved imports",
      value: data.stagedImportJobs.length,
      body:
        data.stagedImportJobs.length > 0
          ? "Staged import jobs are waiting for review or apply."
          : "No staged imports are waiting for review.",
      href: "/imports" as Route,
      cta: "Review imports",
      kind: data.stagedImportJobs.length > 0 ? "action" : "neutral",
    },
    {
      title: "Setup gaps",
      value: data.setupSummary.printerSetupGaps,
      body:
        data.setupSummary.printerSetupGaps > 0
          ? "Some printers are missing an installed component or material path."
          : "Tracked printers have their core setup linked.",
      href: "/printers" as Route,
      cta: "Review fleet",
      kind: data.setupSummary.printerSetupGaps > 0 ? "warning" : "neutral",
    },
  ] as const;

  const quickActions = [
    {
      label: "Import inventory",
      body: "Bring in existing stock and workshop notes through staged review.",
      href: "/imports" as Route,
      icon: Upload,
    },
    {
      label: "Add filament",
      body: "Capture new stock fast without opening a dense edit surface first.",
      href: "/filament" as Route,
      icon: PackagePlus,
    },
    {
      label: "Log maintenance",
      body: "Record service work before it disappears into shop memory.",
      href: "/maintenance" as Route,
      icon: Wrench,
    },
    {
      label: "Add wishlist item",
      body: "Keep upcoming purchases visible before they become blockers.",
      href: "/wishlist" as Route,
      icon: ShoppingCart,
    },
  ];

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_52%,#e2e8f0_100%)] p-0">
        <div className="grid gap-6 p-4 sm:p-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] xl:p-8">
          <PageHeader
            eyebrow="Workshop Control Center"
            title="Know what needs attention next"
            description="Start with the few things that need action, then drill into inventory, operations, and planning when you need detail."
            action={
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-start xl:justify-end">
                <Button asChild className="!text-white [&_svg]:!text-white">
                  <Link href={hasInventory ? "/imports" : "/printers"}>
                    {hasInventory ? "Review imports" : "Start setup"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href={hasInventory ? "/filament" : "/printers"}>
                    {hasInventory ? "Add stock" : "Add first printer"}
                  </Link>
                </Button>
              </div>
            }
          />

          <div className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-medium text-slate-950">Workshop snapshot</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-950 p-4 text-white">
                <p className="text-sm text-slate-300">Printers online</p>
                <p className="mt-2 text-3xl font-semibold">
                  {data.totals.activePrinters}/{data.totals.totalPrinters}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Open planning items</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {data.totals.wishlistCount}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Tracked spools</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {data.totals.totalFilamentSpools}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">30-day maintenance</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {data.totals.maintenanceCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {!hasInventory ? (
        <SectionCard
          title="Start with a guided setup path"
          description="This workspace is still empty. Use onboarding to choose the fastest path in, then come back here for a calmer operational overview."
        >
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[24px] border border-slate-900 bg-slate-950 p-5 text-white">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Recommended</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight">Set up your workshop in a guided flow</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Choose whether to import existing inventory or add your core setup manually, then land back in a simplified dashboard state.
              </p>
              <div className="mt-5">
                <Button asChild className="!text-white [&_svg]:!text-white">
                  <Link href="/imports">
                    Open onboarding
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {[
                {
                  title: "Import real inventory",
                  body: "Use staged CSV or Notes import to onboard existing workshop data safely.",
                  href: "/imports" as Route,
                },
                {
                  title: "Add core workshop setup",
                  body: "Start with printers, then add filament and consumables to activate attention tracking.",
                  href: "/printers" as Route,
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
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Needs attention"
        description="These are the first issues worth checking before you dive into the rest of the workspace."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {attentionCards.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={`rounded-[24px] border p-4 transition hover:-translate-y-0.5 ${attentionTone(item.kind as "warning" | "neutral" | "action")}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className={`text-sm ${item.kind === "action" ? "text-slate-300" : "text-slate-500"}`}>{item.title}</p>
                {item.kind === "warning" ? (
                  <CircleAlert className="h-4 w-4 text-amber-600" />
                ) : null}
              </div>
              <p className={`mt-4 text-3xl font-semibold ${item.kind === "action" ? "text-white" : "text-slate-950"}`}>
                {item.value}
              </p>
              <p className={`mt-2 text-sm leading-6 ${item.kind === "action" ? "text-slate-300" : "text-slate-600"}`}>
                {item.body}
              </p>
              <p className={`mt-4 text-sm font-medium ${item.kind === "action" ? "text-white" : "text-slate-950"}`}>
                {item.cta}
              </p>
            </Link>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title="Quick actions"
          description="Common daily actions are surfaced here first so you do not need to hunt through the full app."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {quickActions.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex items-center gap-2 text-slate-950">
                    <Icon className="h-4 w-4" />
                    <p className="font-medium">{item.label}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                </Link>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="Current state"
          description="A fast summary of active machines, installed setups, and material flow without opening every inventory page."
        >
          <div className="space-y-3">
            {data.printers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-500">
                No printers are tracked yet. Add your first machine or use onboarding to set up your workshop.
              </div>
            ) : (
              data.printers.slice(0, 4).map((printer) => (
                <div
                  key={printer.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="break-words font-medium text-slate-950">{printer.name}</p>
                    <StatusBadge value={printer.status} />
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                    <p className="break-words">Hotend: {printer.installedHotend?.name ?? "Unassigned"}</p>
                    <p className="break-words">Plate: {printer.installedPlate?.name ?? "Unassigned"}</p>
                    <p className="break-words">
                      Material flow: {printer.materialSystems.map((system) => system.name).join(", ") || "None linked"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <SectionCard
          title="Planning"
          description="What purchasing and replenishment work is most likely to matter next."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Wishlist priority</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {data.nextPriority ? titleCase(data.nextPriority.priority) : "None"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {data.nextPriority
                  ? `${data.nextPriority.count} open item(s) are in the highest active priority bucket.`
                  : "No active wishlist items are being tracked yet."}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Consumables nearing threshold</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {data.lowStockConsumables.length}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Review these before the next run to avoid small supply blockers.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {data.lowStockConsumables.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3">
                <div className="min-w-0">
                  <p className="break-words font-medium text-slate-950">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.quantity.toString()} {item.unit} on hand
                  </p>
                </div>
                <StatusBadge value={item.status} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Recent changes"
          description="A compact view of import review and maintenance activity, with the details kept one click away."
        >
          <div className="space-y-3">
            {data.stagedImportJobs.slice(0, 3).map((job) => (
              <Link
                key={job.id}
                href={`/imports?selected=${job.id}#staged-job`}
                className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="break-words font-medium text-slate-950">{job.sourceName}</p>
                  <StatusBadge value={job.status} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {job.totalRows} staged row(s) waiting for review or apply.
                </p>
              </Link>
            ))}
            {data.recentMaintenance.slice(0, 3).map((log) => (
              <div key={log.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="break-words font-medium text-slate-950">{log.actionPerformed}</p>
                  <StatusBadge value={log.actionType} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {log.printer?.name ??
                    log.materialSystem?.name ??
                    log.buildPlate?.name ??
                    log.hotend?.name ??
                    log.safetyEquipment?.name ??
                    "Workshop asset"}
                </p>
              </div>
            ))}
            {data.stagedImportJobs.length === 0 && data.recentMaintenance.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-500">
                Once you start importing data and logging service actions, recent operational changes will show up here.
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Material focus"
        description="A lighter-weight view of current stock shape, with detail pages reserved for deeper review."
      >
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            {data.filamentByMaterial.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-500">
                No filament data yet. Add filament or import your inventory to unlock material-level stock tracking.
              </div>
            ) : (
              data.filamentByMaterial.map((item) => (
                <div key={item.materialType}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 break-words text-slate-600">{item.materialType}</span>
                    <span className="font-medium text-slate-950">{item._sum.quantity ?? 0}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-slate-950"
                      style={{ width: `${Math.max(12, ((item._sum.quantity ?? 0) / 12) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="space-y-3">
            {data.lowStockFilament.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="break-words font-medium text-slate-950">
                    {item.brand} {item.color} {item.materialType}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.quantity} spool(s) · {formatRelativeStock(item.estimatedRemainingGrams)}
                  </p>
                </div>
                <StatusBadge value={item.status} />
              </div>
            ))}
            {data.lowStockFilament.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-500">
                No filament alerts are active right now.
              </div>
            ) : null}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
