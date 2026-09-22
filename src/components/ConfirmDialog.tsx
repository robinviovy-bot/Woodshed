import { Button } from "@/components/Button";

// Inline, on-brand confirmation overlay -- deliberately not the native
// window.confirm(), matching Profile.tsx's own account-deletion
// confirmation card rather than an unstyled browser dialog.
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-card border border-line bg-surface p-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-xl">{title}</h2>
          <p className="text-sm text-ink-secondary">{message}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} className="flex-1">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
