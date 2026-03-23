import { redirect } from "next/navigation";
import type { Route } from "next";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deriveConsumableStatus } from "@/lib/utils";

async function getDailyFocus(workspaceId: string) {
  const [stagedImports, printers, lowFilament, consumables, wishlist] = await Promise.all([
    prisma.importJob.count({ where: { workspaceId, status: "STAGED" } }),
    prisma.printer.count({ where: { workspaceId } }),
    prisma.filamentSpool.count({
      where: {
        workspaceId,
        OR: [{ status: "LOW" }, { nearlyEmpty: true }],
      },
    }),
    prisma.consumableItem.findMany({
      where: { workspaceId, status: { not: "ARCHIVED" } },
      select: { quantity: true, reorderThreshold: true },
    }),
    prisma.wishlistItem.count({
      where: { workspaceId, status: { not: "PURCHASED" } },
    }),
  ]);

  const lowConsumables = consumables.filter((item) => deriveConsumableStatus(Number(item.quantity), Number(item.reorderThreshold)) !== "HEALTHY").length;

  if (stagedImports > 0) {
    return {
      title: "Review staged imports",
      body: `${stagedImports} import job${stagedImports === 1 ? "" : "s"} still need review before those records are fully reflected in the workshop.`,
      href: "/imports#staged-job" as Route,
    };
  }

  if (lowFilament + lowConsumables > 0) {
    return {
      title: "Resolve stock alerts",
      body: `${lowFilament + lowConsumables} inventory alert${lowFilament + lowConsumables === 1 ? "" : "s"} need attention across filament and consumables.`,
      href: (lowFilament > 0 ? "/filament" : "/consumables") as Route,
    };
  }

  if (printers === 0) {
    return {
      title: "Add your first printer",
      body: "Once one printer is tracked, installed hardware, material flow, and maintenance become much easier to manage.",
      href: "/welcome?step=printer" as Route,
    };
  }

  const fallbackFocus = [
    {
      title: "Log recent maintenance",
      body: "Capture the last service action while details are still fresh.",
      href: "/maintenance",
    },
    {
      title: "Review purchase planning",
      body: wishlist > 0 ? "Keep the buying queue current before small blockers pile up." : "Add the next purchase you know is coming so planning stays visible.",
      href: "/wishlist",
    },
    {
      title: "Top up workshop inventory",
      body: "Add the latest stock arrivals so the control center stays current.",
      href: "/filament",
    },
  ] as const;

  const dayIndex = Math.floor(Date.now() / 86400000) % fallbackFocus.length;
  return {
    ...fallbackFocus[dayIndex],
    href: fallbackFocus[dayIndex].href as Route,
  };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id || !session.user.workspaceId) {
    redirect("/sign-in");
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: session.user.workspaceId },
    select: { name: true },
  });
  const dailyFocus = await getDailyFocus(session.user.workspaceId);

  return (
    <div className="app-shell-grid min-h-screen p-1.5 sm:p-4 lg:p-5">
      <div className="mx-auto grid max-w-[1600px] gap-3 sm:gap-5 lg:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="hidden lg:sticky lg:top-5 lg:block lg:h-[calc(100vh-2.5rem)] lg:min-h-0">
          <AppSidebar
            workspaceName={workspace?.name ?? "Workspace"}
            userEmail={session.user.email ?? ""}
            dailyFocus={dailyFocus}
          />
        </div>
        <main className="min-w-0 space-y-5">
          <MobileNav
            workspaceName={workspace?.name ?? "Workspace"}
            userEmail={session.user.email ?? ""}
          />
          {children}
        </main>
      </div>
    </div>
  );
}
