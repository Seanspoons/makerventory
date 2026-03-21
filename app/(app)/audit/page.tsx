import { format } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getAuditEvents } from "@/lib/data";
import { formatEntityName } from "@/lib/utils";

type AuditEvent = Awaited<ReturnType<typeof getAuditEvents>>[number];

export default async function AuditPage() {
  const events = await getAuditEvents();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Governance"
        title="Audit Trail"
        description="Review the most recent state-changing actions across inventory, maintenance, and imports. This is the operational backbone for accountability once the app is carrying real workshop data."
      />

      <SectionCard
        title="Recent audit events"
        description={`${events.length} recent event${events.length === 1 ? "" : "s"} shown.`}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Summary</th>
                <th className="px-4 py-3 font-medium">Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {events.map((event: AuditEvent) => (
                <tr key={event.id} className="align-top">
                  <td className="px-4 py-4 text-slate-600">
                    {format(event.createdAt, "MMM d, yyyy h:mm a")}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge value={event.actionType} />
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    <p className="font-medium text-slate-950">{event.entityLabel ?? formatEntityName(event.entityType)}</p>
                    <p className="mt-1">{formatEntityName(event.entityType)}</p>
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    <p>{event.summary}</p>
                    {event.metadata ? (
                      <pre className="mt-3 max-w-[420px] overflow-x-auto whitespace-pre-wrap rounded-[18px] bg-slate-950 p-3 text-xs leading-6 text-slate-100">
                        {JSON.stringify(event.metadata, null, 2)}
                      </pre>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {event.actorUser?.name ?? event.actorUser?.email ?? "System"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
