import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { apiClient } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";

export interface AppNotification {
  id: number;
  kind: string;
  message: string;
  order_id: number | null;
  order_no: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: number) => void;
  markAllRead: () => void;
  latestToast: AppNotification | null;
  dismissToast: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

const POLL_INTERVAL_MS = 30000;

/**
 * Polls GET /api/notifications/ every 30s (no websockets in v1 — see
 * PLAN.md). Wraps the whole app (see main.tsx) so the unread badge and
 * toast are available from anywhere via useNotifications().
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [latestToast, setLatestToast] = useState<AppNotification | null>(null);
  const seenIds = useRef<Set<number>>(new Set());
  const isFirstLoad = useRef(true);

  const load = useCallback(async () => {
    const { data } = await apiClient.get("/notifications/");
    const list: AppNotification[] = Array.isArray(data) ? data : (data.results ?? []);
    setNotifications(list);

    if (!isFirstLoad.current) {
      const fresh = list.find((n) => !n.is_read && !seenIds.current.has(n.id));
      if (fresh) setLatestToast(fresh);
    }
    isFirstLoad.current = false;
    list.forEach((n) => seenIds.current.add(n.id));
  }, []);

  useEffect(() => {
    if (!user) return;
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, load]);

  async function markRead(id: number) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await apiClient.post(`/notifications/${id}/read/`);
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await apiClient.post("/notifications/read-all/");
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markRead,
        markAllRead,
        latestToast,
        dismissToast: () => setLatestToast(null),
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within a NotificationsProvider");
  return ctx;
}
