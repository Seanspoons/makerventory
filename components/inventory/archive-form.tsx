import { archiveInventoryItem } from "@/app/actions";
import { SubmitButton } from "@/components/forms/submit-button";

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
    <form action={archiveInventoryItem}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <SubmitButton variant="ghost" size="sm">
        {label}
      </SubmitButton>
    </form>
  );
}
