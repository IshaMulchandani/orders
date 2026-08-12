import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "@/api/client";
import OrderForm from "@/components/orders/OrderForm";
import OrderStatusPill from "@/components/OrderStatusPill";
import OrderTimeline from "@/components/OrderTimeline";
import type { DraftOrderLine, OrderDetail as OrderDetailType } from "@/types/order";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await apiClient.get(`/orders/${id}/`);
    setOrder(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading || !order) {
    return <p className="p-4 text-sm text-gray-500">Loading…</p>;
  }

  if (isEditing) {
    const initialLines: DraftOrderLine[] = order.lines.map((l) => ({
      key: String(l.id),
      product: { id: l.product, name: l.product_name },
      quantity: String(l.quantity),
      price: l.price,
    }));
    return (
      <OrderForm
        mode="edit"
        orderId={order.id}
        initialClient={{ id: order.client, name: order.client_name }}
        initialLines={initialLines}
        onSaved={(updated) => {
          setOrder(updated);
          setIsEditing(false);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-navy">{order.order_no}</h1>
          <p className="text-sm text-gray-500">{order.client_name}</p>
        </div>
        <OrderStatusPill status={order.status} />
      </div>

      <div className="mt-1 text-sm text-gray-500">
        Salesman: {order.salesman_name}
        {order.billed_by_name && ` · Billed by: ${order.billed_by_name}`}
      </div>

      {order.can_edit && (
        <button
          onClick={() => setIsEditing(true)}
          className="mt-3 rounded bg-navy px-4 py-2 text-sm text-white hover:bg-navy-light"
        >
          Edit Order
        </button>
      )}

      <div className="mt-6">
        <h2 className="text-sm font-medium text-gray-700">Items</h2>
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="py-2">Product</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Price</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => (
              <tr key={line.id} className="border-b border-gray-100">
                <td className="py-2">{line.product_name}</td>
                <td className="text-right">{line.quantity}</td>
                <td className="text-right">₹{Number(line.price).toFixed(2)}</td>
                <td className="text-right">₹{Number(line.line_total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-right text-lg font-semibold text-navy">
          Total: ₹{Number(order.total).toFixed(2)}
        </p>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-medium text-gray-700">Activity</h2>
        <div className="mt-2">
          <OrderTimeline events={order.events} />
        </div>
      </div>

      <button onClick={() => navigate("/orders")} className="mt-6 text-sm text-navy-light hover:underline">
        ← Back to Orders
      </button>
    </div>
  );
}
