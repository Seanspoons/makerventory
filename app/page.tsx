import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";

const featureGroups = [
  {
    title: "Workshop operations in one place",
    body: "Track printers, filament, hotends, plates, consumables, safety gear, maintenance, and purchase planning in one system.",
  },
  {
    title: "Set up with your own data",
    body: "Bring in your inventory, organize your workshop, and build a system that reflects how your setup actually runs.",
  },
  {
    title: "Built for dependable use",
    body: "Keep records organized, reduce guesswork, and make day-to-day workshop decisions from a clearer operational picture.",
  },
];

const workflowSteps = [
  "Set up your workspace",
  "Import filament, consumables, tools, and wishlist data",
  "Track maintenance, risk, and purchase planning from a live dashboard",
];

export default async function LandingPage() {
  const session = await auth();
  const primaryHref = session?.user?.workspaceId ? "/dashboard" : "/sign-up";
  const secondaryHref = session?.user?.workspaceId ? "/imports" : "/sign-in";

  return (
    <main className="app-shell-grid min-h-screen px-3 py-4 sm:px-4 lg:px-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <header className="rounded-[30px] border border-slate-200/80 bg-white/90 px-4 py-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 p-2.5">
                <Image
                  src="/brand/makerventory-mark-light.svg"
                  alt="Makerventory mark"
                  width={34}
                  height={34}
                  className="h-8.5 w-8.5"
                  priority
                />
              </div>
              <div className="min-w-0">
                <p
                  className="text-[1.9rem] leading-none tracking-[0.04em] text-slate-950"
                  style={{
                    fontFamily:
                      '"Rajdhani", "DIN Alternate", "Arial Narrow", ui-sans-serif, system-ui, sans-serif',
                  }}
                >
                  <span className="font-bold">Maker</span>
                  <span className="font-normal">ventory</span>
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  3D Printing Inventory and Operations Manager
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="secondary">
                <Link href={secondaryHref}>{session ? "Open imports" : "Sign in"}</Link>
              </Button>
              <Button asChild className="!text-white [&_svg]:!text-white">
                <Link href={primaryHref}>
                  {session ? "Open dashboard" : "Create workspace"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="overflow-hidden bg-[linear-gradient(145deg,#ffffff_0%,#f8fafc_45%,#e2e8f0_100%)] p-0">
            <div className="space-y-6 p-5 sm:p-7 lg:p-9">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">
                <Sparkles className="h-3.5 w-3.5" />
                Workshop operations platform
              </div>

              <div className="space-y-4">
                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                  Run your 3D printing workshop like an actual operation.
                </h1>
                <p className="max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
                  Makerventory gives serious makers, labs, and small print shops a structured system for inventory, maintenance, compatibility, safety, and purchasing without collapsing into spreadsheet sprawl.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Inventory domains", value: "10+" },
                  { label: "Workshop visibility", value: "Live" },
                  { label: "Planning view", value: "Unified" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[24px] border border-slate-200 bg-white/70 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]"
                  >
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="!text-white [&_svg]:!text-white">
                  <Link href={primaryHref}>
                    {session ? "Go to dashboard" : "Start your workspace"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/imports">View import workflow</Link>
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid gap-5">
            <Card className="overflow-hidden p-0">
              <div className="relative aspect-[4/3] min-h-[320px]">
                <Image
                  src="/hero-img.webp"
                  alt="Organized 3D printing workshop"
                  fill
                  priority
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.18)_38%,rgba(15,23,42,0.72)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <div className="max-w-md rounded-[24px] border border-white/20 bg-slate-950/70 p-4 text-white backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                      Workshop view
                    </p>
                    <p className="mt-2 text-lg font-semibold tracking-tight">
                      Built for organized, high-output printing spaces
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-200">
                      Keep printers, materials, maintenance, and purchasing aligned around the way your workshop actually operates.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-950 p-5 text-white sm:p-6">
              <p className="text-sm text-slate-400">What it replaces</p>
              <div className="mt-4 space-y-4">
                {[
                  "Spreadsheet tabs for filament, consumables, and purchase plans",
                  "Loose notes for nozzle swaps, desiccant refreshes, and maintenance history",
                  "Mental tracking for compatibility between printers, plates, materials, and hotends",
                ].map((item) => (
                  <div key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                    <p className="text-sm leading-6 text-slate-100">{item}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <p className="text-sm text-slate-500">Operational workflow</p>
              <div className="mt-4 space-y-4">
                {workflowSteps.map((step, index) => (
                  <div key={step} className="flex gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                      {index + 1}
                    </div>
                    <p className="pt-1 text-sm leading-6 text-slate-700">{step}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {featureGroups.map((feature) => (
            <Card key={feature.title} className="p-5 sm:p-6">
              <p className="text-xl font-semibold tracking-tight text-slate-950">
                {feature.title}
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{feature.body}</p>
            </Card>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
              <ShieldCheck className="h-4 w-4" />
              Built for dependable operation
            </div>
            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
              <p>
                Makerventory is designed for workshops that need clean records, clear accountability, and an organized view of what is running, what is low, and what needs attention next.
              </p>
              <p>
                It gives you one place to manage inventory, maintenance, compatibility, purchasing, and day-to-day operating decisions without falling back to scattered notes and spreadsheets.
              </p>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
              <Wrench className="h-4 w-4" />
              Built for serious makers
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                "Printer and component compatibility tracking",
                "Filament handling risk and stock visibility",
                "Maintenance history and workshop governance",
                "Purchase planning and operational wishlist management",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </section>

        <footer className="rounded-[28px] border border-slate-200/80 bg-white/90 px-5 py-5 text-sm text-slate-500 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p>Build a cleaner operating system for your printers, materials, maintenance, and purchasing.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="secondary">
                <Link href={secondaryHref}>{session ? "Open imports" : "Sign in"}</Link>
              </Button>
              <Button asChild className="!text-white [&_svg]:!text-white">
                <Link href={primaryHref}>{session ? "Dashboard" : "Create workspace"}</Link>
              </Button>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
