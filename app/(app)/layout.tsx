import { AppSidebar } from "@/components/app-sidebar";

export const dynamic = "force-dynamic";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell-grid min-h-screen p-4 lg:p-5">
      <div className="mx-auto grid max-w-[1600px] gap-5 lg:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)] lg:min-h-0">
          <AppSidebar />
        </div>
        <main className="space-y-5">{children}</main>
      </div>
    </div>
  );
}
