import { archiveInventoryItem } from "@/app/actions";
import { ConfirmActionForm } from "@/components/inventory/confirm-action-form";

export function ArchiveForm({
  id,
  kind,
  label = "Archive",
}: {
  id: string;
  kind: string;
  label?: string;
}) {
  return (
    <ConfirmActionForm
      action={archiveInventoryItem}
      title={`${label} record?`}
      description="This change is persisted immediately. Use this for archiving, retiring, disabling, deleting, or marking the selected record as purchased."
      confirmLabel={label}
      triggerLabel={label}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
    </ConfirmActionForm>
  );
}
