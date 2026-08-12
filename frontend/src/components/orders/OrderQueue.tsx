import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "@/api/client";
import OrderStatusPill from "@/components/OrderStatusPill";
import type { OrderListItem } from "@/types/order";

export interface OrderQueueTab {
  label: string;
  /** Which orders belong in this tab, out of everything the backend already scoped to this user. */
  match: (order: OrderListItem) => boolean;
}

interface OrderQueueProps {
  tabs: OrderQueueTab[];
}

/**
 * Tabbed order list. Fetches the full set of orders visible to the
 * current user once (the backend's role-based scoping already handles
 * "which orders can I see at all" — see apps.orders.services.orders_visible_to),
 * then buckets them into tabs client-side via each tab's `match`
 * predicate. One component drives the Partner dashboard, the Salesman
 * order list, and the Accountant/Packaging queues — only the tab
 * config passed in (see pages/Orders.tsx) differs per role.
 */
export default function OrderQueue({ tabs }: OrderQueueProps) {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    apiClient.get("/orders/").then(({ data }) => {
      setOrders(Array.isArray(data) ? data : (data.results ?? []));
      setLoading(false);
    });
  }, []);

  const visible = orders.filter(tabs[activeTab]?.match ?? (() => true));

  return (
    <div>
      {tabs.length > 1 && (
        <div className="flex gap-1 border-b border-gray-200">
          {tabs.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2 text-sm font-medium ${
                i === activeTab
                  ? "border-b-2 border-navy text-navy"
                  : "text-gray-500 hover:text-navy"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="py-2">Order #</th>
                <th>Client</th>
                <th>Salesman</th>
                <th>Status</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => (
                <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2">
                    <Link to={`/orders/${order.id}`} className="text-navy-light hover:underline">
                      {order.order_no}
                    </Link>
                  </td>
                  <td>{order.client_name}</td>
                  <td>{order.salesman_name}</td>
                  <td>
                    <OrderStatusPill status={order.status} />
                  </td>
                  <td className="text-right">₹{Number(order.total).toFixed(2)}</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-400">
                    No orders here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
