import { Button } from "@/components/ui/button";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
          {eyebrow}
        </p>
        <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight text-slate-950 lg:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl break-words text-sm leading-7 text-slate-600 lg:text-base">
          {description}
        </p>
      </div>
      {action ?? (
        <Button variant="secondary" type="button">
          Quick Add
        </Button>
      )}
    </div>
  );
}
