import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { ArrowRight, Search } from "lucide-react";
import { LabeledField } from "@/components/forms/labeled-field";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBuildPlateSize, formatMaterialSystemType, titleCase } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type SearchResult = {
  id: string;
  title: string;
  meta: string;
  href: Route;
};

function normalizeQuery(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function contains(query: string) {
  return { contains: query, mode: "insensitive" as const };
}

function buildResult(title: string, meta: string, href: Route, id: string): SearchResult {
  return { id, title, meta, href };
}

async function searchWorkspace(workspaceId: string, query: string) {
  const [printers, filament, buildPlates, hotends, materialSystems, consumables, wishlist] =
    await Promise.all([
      prisma.printer.findMany({
        where: {
          workspaceId,
          OR: [{ name: contains(query) }, { brand: contains(query) }, { model: contains(query) }, { notes: contains(query) }],
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: { id: true, slug: true, name: true, brand: true, model: true, status: true, location: true },
      }),
      prisma.filamentSpool.findMany({
        where: {
          workspaceId,
          OR: [
            { brand: contains(query) },
            { materialType: contains(query) },
            { color: contains(query) },
            { subtype: contains(query) },
            { finish: contains(query) },
            { notes: contains(query) },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: { id: true, brand: true, materialType: true, color: true, quantity: true, status: true },
      }),
      prisma.buildPlate.findMany({
        where: {
          workspaceId,
          OR: [{ name: contains(query) }, { surfaceType: contains(query) }, { notes: contains(query) }],
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: { id: true, name: true, sizeMm: true, surfaceType: true, status: true },
      }),
      prisma.hotend.findMany({
        where: {
          workspaceId,
          OR: [{ name: contains(query) }, { materialType: contains(query) }, { notes: contains(query) }],
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: { id: true, name: true, nozzleSize: true, materialType: true, status: true },
      }),
      prisma.materialSystem.findMany({
        where: {
          workspaceId,
          OR: [{ name: contains(query) }, { supportedMaterialsNotes: contains(query) }, { notes: contains(query) }],
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: { id: true, name: true, type: true, status: true, assignedPrinter: { select: { name: true } } },
      }),
      prisma.consumableItem.findMany({
        where: {
          workspaceId,
          OR: [{ name: contains(query) }, { category: contains(query) }, { storageLocation: contains(query) }, { notes: contains(query) }],
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: { id: true, name: true, category: true, quantity: true, unit: true },
      }),
      prisma.wishlistItem.findMany({
        where: {
          workspaceId,
          OR: [{ name: contains(query) }, { category: contains(query) }, { vendor: contains(query) }, { notes: contains(query) }],
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: { id: true, name: true, category: true, priority: true, status: true },
      }),
    ]);

  return [
    {
      title: "Printers",
      description: "Machines, installed hardware, and linked controls.",
      results: printers.map((item) =>
        buildResult(
          item.name,
          `${item.brand} ${item.model}${item.location ? ` · ${item.location}` : ""} · ${titleCase(item.status)}`,
          `/printers/${item.slug}` as Route,
          item.id,
        ),
      ),
    },
    {
      title: "Filament",
      description: "Material stock, risk, and planning inventory.",
      results: filament.map((item) =>
        buildResult(
          `${item.brand} ${item.color} ${item.materialType}`,
          `${item.quantity} spool${item.quantity === 1 ? "" : "s"} · ${titleCase(item.status)}`,
          `/filament?selected=${item.id}` as Route,
          item.id,
        ),
      ),
    },
    {
      title: "Build Plates",
      description: "Plate inventory and installed surfaces.",
      results: buildPlates.map((item) =>
        buildResult(
          item.name,
          `${formatBuildPlateSize(item.sizeMm)} · ${item.surfaceType} · ${titleCase(item.status)}`,
          `/build-plates?selected=${item.id}` as Route,
          item.id,
        ),
      ),
    },
    {
      title: "Hotends",
      description: "Installed and spare nozzle assemblies.",
      results: hotends.map((item) =>
        buildResult(
          item.name,
          `${item.nozzleSize.toString()} mm · ${item.materialType} · ${titleCase(item.status)}`,
          `/hotends?selected=${item.id}` as Route,
          item.id,
        ),
      ),
    },
    {
      title: "Material Systems",
      description: "AMS units, dryers, and linked material flow hardware.",
      results: materialSystems.map((item) =>
        buildResult(
          item.name,
          `${formatMaterialSystemType(item.type)}${item.assignedPrinter?.name ? ` · Assigned to ${item.assignedPrinter.name}` : ""} · ${titleCase(item.status)}`,
          `/material-systems?selected=${item.id}` as Route,
          item.id,
        ),
      ),
    },
    {
      title: "Consumables",
      description: "Shop supplies and reorder items.",
      results: consumables.map((item) =>
        buildResult(
          item.name,
          `${item.category} · ${item.quantity.toString()} ${item.unit}`,
          `/consumables?selected=${item.id}` as Route,
          item.id,
        ),
      ),
    },
    {
      title: "Wishlist",
      description: "Upcoming purchases and planning.",
      results: wishlist.map((item) =>
        buildResult(
          item.name,
          `${item.category} · ${titleCase(item.priority)} priority · ${titleCase(item.status)}`,
          `/wishlist?selected=${item.id}` as Route,
          item.id,
        ),
      ),
    },
  ];
}

export default async function SearchPage(props: { searchParams?: SearchParams }) {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    redirect("/sign-in");
  }

  const searchParams = (await props.searchParams) ?? {};
  const query = normalizeQuery(searchParams.q);
  const sections = query ? await searchWorkspace(session.user.workspaceId, query) : [];
  const totalResults = sections.reduce((sum, section) => sum + section.results.length, 0);

  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-6 lg:p-8">
        <PageHeader
          eyebrow="Search"
          title="Search your workshop"
          description="Jump straight to printers, stock, setup hardware, and planning records without hunting through each workspace surface."
          action={
            <form method="get" action="/search" className="w-full max-w-xl">
              <LabeledField label="Search your workshop" className="w-full">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    id="workspace-search"
                    name="q"
                    defaultValue={query}
                    placeholder="Search by printer, filament, plate, hotend, notes, or vendor"
                    autoFocus
                  />
                  <Button type="submit" className="shrink-0 !text-white [&_svg]:!text-white">
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                </div>
              </LabeledField>
            </form>
          }
        />
      </Card>

      {!query ? (
        <SectionCard
          title="Start with a name, material, or note"
          description="Search works best for inventory names, brands, materials, notes, vendors, and locations."
        >
          <div className="grid gap-3 md:grid-cols-3">
            {[
              "A1 Mini",
              "PETG",
              "Textured Build Plate",
              "AMS",
              "Lubricant",
              "IKEA",
            ].map((example) => (
              <Link
                key={example}
                href={`/search?q=${encodeURIComponent(example)}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white hover:text-slate-950"
              >
                Search for “{example}”
              </Link>
            ))}
          </div>
        </SectionCard>
      ) : (
        <>
          <SectionCard
            title="Search overview"
            description={
              totalResults > 0
                ? `${totalResults} result${totalResults === 1 ? "" : "s"} matched “${query}” across the main workshop surfaces.`
                : `No results matched “${query}”. Try a printer name, material, vendor, or note keyword.`
            }
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {sections.map((section) => (
                <div key={section.title} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm text-slate-500">{section.title}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{section.results.length}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="grid gap-5 xl:grid-cols-2">
            {sections.map((section) => (
              <SectionCard
                key={section.title}
                title={section.title}
                description={section.description}
              >
                {section.results.length > 0 ? (
                  <div className="space-y-3">
                    {section.results.map((result) => (
                      <Link
                        key={result.id}
                        href={result.href}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-slate-300 hover:bg-white"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-950">{result.title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-500">{result.meta}</p>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-500">
                    No matches in {section.title.toLowerCase()}.
                  </div>
                )}
              </SectionCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
