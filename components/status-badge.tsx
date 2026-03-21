import { cn, titleCase } from "@/lib/utils";

const palette: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  AVAILABLE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  HEALTHY: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ONLINE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  STANDBY: "bg-amber-50 text-amber-700 ring-amber-200",
  IN_USE: "bg-sky-50 text-sky-700 ring-sky-200",
  MAINTENANCE: "bg-amber-50 text-amber-700 ring-amber-200",
  LOW: "bg-amber-50 text-amber-700 ring-amber-200",
  NEEDS_ATTENTION: "bg-amber-50 text-amber-700 ring-amber-200",
  RESEARCHING: "bg-sky-50 text-sky-700 ring-sky-200",
  READY_TO_BUY: "bg-violet-50 text-violet-700 ring-violet-200",
  STAGED: "bg-sky-50 text-sky-700 ring-sky-200",
  MATCHED: "bg-amber-50 text-amber-700 ring-amber-200",
  CONFLICT: "bg-rose-50 text-rose-700 ring-rose-200",
  NEW: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  APPLIED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ERROR: "bg-rose-50 text-rose-700 ring-rose-200",
  SKIPPED: "bg-slate-100 text-slate-600 ring-slate-200",
  OFFLINE: "bg-slate-100 text-slate-600 ring-slate-200",
  PLANNED: "bg-slate-100 text-slate-700 ring-slate-200",
  DISABLED: "bg-slate-100 text-slate-600 ring-slate-200",
  WORN: "bg-orange-50 text-orange-700 ring-orange-200",
  OUT: "bg-rose-50 text-rose-700 ring-rose-200",
  RETIRED: "bg-slate-100 text-slate-500 ring-slate-200",
  ARCHIVED: "bg-slate-100 text-slate-500 ring-slate-200",
  CRITICAL: "bg-rose-50 text-rose-700 ring-rose-200",
  HIGH: "bg-orange-50 text-orange-700 ring-orange-200",
  MEDIUM: "bg-sky-50 text-sky-700 ring-sky-200",
  LOW_PRIORITY: "bg-slate-100 text-slate-600 ring-slate-200",
  PURCHASED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        palette[value] ?? "bg-slate-100 text-slate-700 ring-slate-200",
      )}
    >
      {value === "LOW_PRIORITY" ? "Low" : titleCase(value)}
    </span>
  );
}
