import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

  return (
    <div className="app-shell-grid min-h-screen p-2 sm:p-4 lg:p-5">
      <div className="mx-auto grid max-w-[1600px] gap-3 sm:gap-5 lg:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)] lg:min-h-0">
          <AppSidebar
            workspaceName={workspace?.name ?? "Workspace"}
            userEmail={session.user.email ?? ""}
          />
        </div>
        <main className="min-w-0 space-y-5">{children}</main>
      </div>
    </div>
  );
}
