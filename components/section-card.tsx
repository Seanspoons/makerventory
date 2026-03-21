import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("min-w-0 p-4 sm:p-5 lg:p-6", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 break-words text-sm leading-6 text-slate-600">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  );
}
