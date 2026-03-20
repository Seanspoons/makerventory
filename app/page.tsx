export default function HomePage() {
  return (
    <main className="app-shell-grid flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-4xl rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-10 shadow-[var(--shadow)] backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-[var(--text-muted)]">
          Makerventory
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
          3D Printing Inventory and Operations Manager
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          The app scaffold is in place. Data modeling, workflows, and seeded
          operations views will be added next.
        </p>
      </div>
    </main>
  );
}
