import { Search } from "lucide-react";
import { SectionCard } from "@/components/section-card";

export function FilterBar({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <SectionCard
      title="Filters"
      description="Search, narrow, and sort this inventory view."
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
          {children}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </SectionCard>
  );
}

export function SearchHint() {
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
      <Search className="h-4 w-4" />
      Search by name, brand, material, note, or assignment
    </div>
  );
}
