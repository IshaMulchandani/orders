import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";

const TERMINAL_KINDS = ["DONE", "CANCELLED"];

function routeFor(n: AppNotification): string {
  if (TERMINAL_KINDS.includes(n.kind)) return "/history";
  return n.order_id ? `/orders/${n.order_id}` : "/orders";
}

/** Bell icon + unread badge + dropdown list, lives in AppShell's header. */
export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  function handleClick(n: AppNotification) {
    if (!n.is_read) markRead(n.id);
    setOpen(false);
    navigate(routeFor(n));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded hover:bg-white/10"
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 max-h-96 w-80 overflow-auto rounded border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <span className="text-sm font-medium text-navy">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={() => markAllRead()} className="text-xs text-navy-light hover:underline">
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-gray-400">No notifications yet.</p>
          )}
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`block w-full border-b border-gray-50 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                n.is_read ? "text-gray-500" : "font-medium text-navy"
              }`}
            >
              {n.message}
              <div className="text-xs font-normal text-gray-400">{new Date(n.created_at).toLocaleString()}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
