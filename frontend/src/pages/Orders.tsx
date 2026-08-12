import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "@/api/client";
import OrderStatusPill from "@/components/OrderStatusPill";
import { useAuth } from "@/hooks/useAuth";
import type { OrderListItem } from "@/types/order";

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/orders/").then(({ data }) => {
      setOrders(Array.isArray(data) ? data : (data.results ?? []));
      setLoading(false);
    });
  }, []);

  const canCreate = user?.role === "PARTNER" || user?.role === "SALESMAN";

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-navy">Orders</h1>
        {canCreate && (
          <Link to="/orders/new" className="rounded bg-navy px-4 py-2 text-sm text-white hover:bg-navy-light">
            + New Order
          </Link>
        )}
      </div>

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
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-400">
                    No orders yet.
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
