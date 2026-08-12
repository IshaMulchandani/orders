import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";

const TERMINAL_KINDS = ["DONE", "CANCELLED"];
const AUTO_DISMISS_MS = 6000;

/** Transient popup shown when a new notification arrives while the app is open. Auto-dismisses after a few seconds. */
export default function NotificationToast() {
  const { latestToast, dismissToast, markRead } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    if (!latestToast) return;
    const t = setTimeout(dismissToast, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [latestToast, dismissToast]);

  if (!latestToast) return null;

  function handleClick() {
    if (!latestToast) return;
    markRead(latestToast.id);
    dismissToast();
    if (TERMINAL_KINDS.includes(latestToast.kind)) {
      navigate("/history");
    } else if (latestToast.order_id) {
      navigate(`/orders/${latestToast.order_id}`);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded border border-gray-200 bg-white p-4 shadow-lg">
      <button onClick={handleClick} className="block w-full text-left">
        <p className="text-sm font-medium text-navy">New update</p>
        <p className="mt-1 text-sm text-gray-600">{latestToast.message}</p>
      </button>
      <button onClick={dismissToast} className="mt-2 text-xs text-gray-400 hover:underline">
        Dismiss
      </button>
    </div>
  );
}
