import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Boxes, PackagePlus, Upload, Wrench } from "lucide-react";
import { createInventoryItem } from "@/app/actions";
import { auth } from "@/lib/auth";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function WelcomePage(props: { searchParams?: SearchParams }) {
  const searchParams = (await props.searchParams) ?? {};
  const step = typeof searchParams.step === "string" ? searchParams.step : "start";
  const session = await auth();
  const workspaceId = session?.user.workspaceId;

  if (!workspaceId) {
    redirect("/dashboard");
  }

  const [printerCount, filamentCount, importCount] = await Promise.all([
    prisma.printer.count({ where: { workspaceId } }),
    prisma.filamentSpool.aggregate({ where: { workspaceId }, _sum: { quantity: true } }),
    prisma.importJob.count({ where: { workspaceId } }),
  ]);

  const hasSetup = printerCount > 0 || (filamentCount._sum.quantity ?? 0) > 0 || importCount > 0;

  if (hasSetup && step === "start") {
    redirect("/dashboard");
  }

  const setupPaths = [
    {
      title: "Import existing inventory",
      body: "Best if your workshop already lives in Apple Notes, spreadsheets, or another inventory list.",
      href: "/imports",
      icon: Upload,
    },
    {
      title: "Add core workshop setup manually",
      body: "Best if you want to enter your first printer and filament before importing the rest later.",
      href: "/welcome?step=printer",
      icon: Wrench,
    },
    {
      title: "Explore the product structure",
      body: "Go to the calmer dashboard and learn the product from the main navigation.",
      href: "/dashboard",
      icon: Boxes,
    },
  ];

  return (
    <div className="space-y-5">
      <SectionCard
        title="Welcome to Makerventory"
        description="Makerventory helps you keep printers, filament, maintenance, purchasing, and workshop operations visible in one place without relying on scattered notes."
      >
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-slate-900 bg-slate-950 p-5 text-white sm:p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">First-run setup</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">Choose the fastest way into your real workspace</p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Keep this short. Start with imports if you already have records, or add one printer and one material to make the rest of the app easier to understand.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild className="!text-white [&_svg]:!text-white">
                <Link href="/imports">
                  Import inventory
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/welcome?step=printer">Add first printer</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {setupPaths.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  href={item.href as Parameters<typeof Link>[0]["href"]}
                  className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex items-center gap-2 text-slate-950">
                    <Icon className="h-4 w-4" />
                    <p className="font-medium">{item.title}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <SectionCard
          title="1. Add your first printer"
          description="A single printer record is enough to make the rest of the workspace easier to understand."
          className={step === "printer" ? "ring-1 ring-slate-300" : undefined}
        >
          <form action={createInventoryItem} className="grid gap-4 lg:grid-cols-2">
            <input type="hidden" name="kind" value="printer" />
            <input type="hidden" name="returnTo" value="/welcome?step=filament" />
            <Input name="name" placeholder="Bambu Lab A1 Mini" required />
            <Input name="brand" placeholder="Bambu Lab" required />
            <Input name="model" placeholder="A1 Mini" required />
            <Input name="location" placeholder="Bench location" />
            <Input name="buildVolumeX" type="number" placeholder="180" required />
            <Input name="buildVolumeY" type="number" placeholder="180" required />
            <Input name="buildVolumeZ" type="number" placeholder="180" required />
            <Textarea name="notes" placeholder="Optional workshop notes" className="lg:col-span-2" />
            <div className="lg:col-span-2">
              <SubmitButton>Add first printer</SubmitButton>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="2. Add your first filament"
          description="Start with one material so stock alerts and print-planning surfaces become useful immediately."
          className={step === "filament" ? "ring-1 ring-slate-300" : undefined}
        >
          <form action={createInventoryItem} className="grid gap-4 lg:grid-cols-2">
            <input type="hidden" name="kind" value="filament" />
            <input type="hidden" name="returnTo" value="/dashboard" />
            <Input name="brand" placeholder="Bambu Lab" required />
            <Input name="materialType" placeholder="PLA" required />
            <Input name="color" placeholder="White" required />
            <Input name="quantity" type="number" min="1" defaultValue="1" />
            <Input name="estimatedRemainingGrams" type="number" defaultValue="1000" />
            <Input name="storageLocation" placeholder="Drawer or shelf" />
            <Textarea name="notes" placeholder="Optional stock note" className="lg:col-span-2" />
            <div className="lg:col-span-2">
              <SubmitButton>
                <PackagePlus className="mr-2 h-4 w-4" />
                Add first filament
              </SubmitButton>
            </div>
          </form>
        </SectionCard>
      </div>

      <SectionCard
        title="What happens next"
        description="Once you have a few real records in place, the Control Center becomes the main home for attention items, quick actions, and workshop state."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="font-medium text-slate-950">Needs attention</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Low stock, unresolved imports, and setup gaps surface first.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="font-medium text-slate-950">Daily operations</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Maintenance, imports, and inventory stay one click away without crowding the first view.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="font-medium text-slate-950">Planning</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Wishlist and replenishment decisions become easier once a small amount of real data is in place.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link href="/dashboard">Skip to Control Center</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/imports">Use imports instead</Link>
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
