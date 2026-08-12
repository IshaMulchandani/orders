interface ConfirmProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  /** Red confirm button for destructive actions (delete, cancel order, etc.) */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Reusable confirmation modal. Used for hard-delete confirmations now
 * (Clients/Products) and order cancellation later — one component,
 * parametrised by props, instead of a bespoke modal per feature.
 */
export default function Confirm({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger,
  onConfirm,
  onCancel,
}: ConfirmProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded bg-white p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-navy">{title}</h2>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`rounded px-4 py-2 text-sm text-white ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-navy hover:bg-navy-light"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
