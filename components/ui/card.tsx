import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-[28px] border border-slate-200/80 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}
