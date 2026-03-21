import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuickAddShell({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <details className={cn("group rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5", className)}>
      <summary className="flex cursor-pointer list-none flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Common action
          </p>
          <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
            {title}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <Plus className="h-4 w-4" />
          Open form
        </span>
      </summary>
      <div className="mt-5 border-t border-slate-100 pt-5">{children}</div>
    </details>
  );
}
