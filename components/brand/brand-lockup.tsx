import { cn } from "@/lib/utils";

export function BrandLockup({
  theme = "dark",
  size = "default",
  subtitle,
  className,
}: {
  theme?: "dark" | "light";
  size?: "compact" | "default";
  subtitle?: string;
  className?: string;
}) {
  const darkTheme = theme === "dark";
  const wordmarkSrc = darkTheme
    ? "/brand/makerventory-wordmark-no-logo-dark.svg"
    : "/brand/makerventory-wordmark-no-logo-light.svg";
  const markClassName = size === "compact" ? "h-8 w-8" : "h-9.5 w-9.5";
  const wordmarkWidthClass = size === "compact" ? "w-[180px] sm:w-[200px]" : "w-[210px] sm:w-[240px]";

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div
        className={cn(
          "shrink-0 flex items-center justify-center rounded-2xl p-2.5 shadow-[0_4px_4px_rgba(0,0,0,0.25)]",
          darkTheme ? "bg-slate-950" : "bg-white/10",
          size === "compact" ? "h-12 w-12" : "h-14 w-14",
        )}
      >
        <object
          type="image/svg+xml"
          data="/brand/makerventory-mark-light.svg"
          aria-label="Makerventory mark"
          className={cn("pointer-events-none block", markClassName)}
        >
          Makerventory mark
        </object>
      </div>

      <div className="min-w-0">
        <object
          type="image/svg+xml"
          data={wordmarkSrc}
          aria-label="MAKERVENTORY"
          className={cn(
            "pointer-events-none block h-auto max-w-full",
            wordmarkWidthClass,
          )}
        >
          MAKERVENTORY
        </object>
        {subtitle ? (
          <p className={cn("mt-1 text-xs sm:text-sm", darkTheme ? "text-slate-500" : "text-slate-300")}>
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
