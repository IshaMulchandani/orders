import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "@/api/client";
import OrderStatusPill from "@/components/OrderStatusPill";
import type { OrderListItem } from "@/types/order";

type KindFilter = "all" | "done" | "cancelled";

/** Partner-only. Chronological Done + Cancelled orders — the click-through target for Done/Cancelled notifications. */
export default function History() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<KindFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      const params: Record<string, string> = {};
      if (kind !== "all") params.kind = kind;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (q) params.q = q;
      const { data } = await apiClient.get("/history/", { params });
      setOrders(Array.isArray(data) ? data : (data.results ?? []));
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [kind, dateFrom, dateTo, q]);

  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="text-xl font-semibold text-navy">History</h1>
      <p className="text-sm text-gray-500">Completed and cancelled orders.</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as KindFilter)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">All</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <div className="flex gap-3">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-1/2 rounded border border-gray-300 px-3 py-2 text-sm sm:w-auto"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-1/2 rounded border border-gray-300 px-3 py-2 text-sm sm:w-auto"
          />
        </div>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by client…"
          className="min-w-[10rem] flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="space-y-2 sm:hidden">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="block rounded border border-gray-200 bg-white p-3 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-navy">{order.order_no}</span>
                    <OrderStatusPill status={order.status} />
                  </div>
                  <p className="mt-1 truncate text-sm text-gray-600">{order.client_name}</p>
                  <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                    <span className="text-sm font-medium text-navy">₹{Number(order.total).toFixed(2)}</span>
                  </div>
                </Link>
              ))}
              {orders.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-400">No matching orders.</p>
              )}
            </div>

            {/* sm+: table */}
            <table className="hidden w-full text-left text-sm sm:table">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-2">Order #</th>
                  <th>Client</th>
                  <th>Salesman</th>
                  <th>Status</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
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
                    <td className="text-right">{new Date(order.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-gray-400">
                      No matching orders.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
