import { Card } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <p className="break-words text-sm leading-6 text-slate-500">{label}</p>
      <p className="mt-4 break-words text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-3 break-words text-sm leading-6 text-slate-600">{helper}</p>
    </Card>
  );
}
