import { cn } from "@/lib/utils";

export function LabeledField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("grid gap-2 text-sm text-slate-700", className)}>
      <span className="font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
