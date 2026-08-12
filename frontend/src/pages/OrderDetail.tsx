import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "@/api/client";
import Confirm from "@/components/Confirm";
import OrderForm from "@/components/orders/OrderForm";
import OrderStatusPill from "@/components/OrderStatusPill";
import OrderTimeline from "@/components/OrderTimeline";
import type { DraftOrderLine, OrderAction, OrderDetail as OrderDetailType } from "@/types/order";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

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

  async function runTransition(to_status: OrderAction["to_status"]) {
    setActionError(null);
    setActionPending(true);
    try {
      const { data } = await apiClient.post(`/orders/${id}/transition/`, { to_status });
      setOrder(data);
    } catch (err: any) {
      setActionError(err.response?.data?.detail ?? "Could not update this order.");
    } finally {
      setActionPending(false);
      setConfirmCancel(false);
    }
  }

  function handleActionClick(action: OrderAction) {
    if (action.to_status === "CANCELLED") {
      setConfirmCancel(true);
      return;
    }
    runTransition(action.to_status);
  }

  if (loading || !order) {
    return <p className="p-4 text-sm text-gray-500">Loading…</p>;
  }

  if (isEditing) {
    const initialLines: DraftOrderLine[] = order.lines.map((l) => ({
      key: String(l.id),
      // If the product was hard-deleted since this line was created,
      // l.product is null — leave it unselected so the form's own
      // "every line needs a product" validation catches it with a
      // clear message, rather than silently submitting a bad id.
      product: l.product !== null ? { id: l.product, name: l.product_name } : null,
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

  const nonCancelActions = order.available_actions.filter((a) => a.to_status !== "CANCELLED");
  const cancelAction = order.available_actions.find((a) => a.to_status === "CANCELLED");

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-navy">{order.order_no}</h1>
          <p className="truncate text-sm text-gray-500">{order.client_name}</p>
        </div>
        <OrderStatusPill status={order.status} />
      </div>

      <div className="mt-1 text-sm text-gray-500">
        Salesman: {order.salesman_name}
        {order.billed_by_name && ` · Billed by: ${order.billed_by_name}`}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {order.can_edit && (
          <button
            onClick={() => setIsEditing(true)}
            className="rounded bg-navy px-4 py-2 text-sm text-white hover:bg-navy-light"
          >
            Edit Order
          </button>
        )}
        {nonCancelActions.map((action) => (
          <button
            key={action.to_status}
            onClick={() => handleActionClick(action)}
            disabled={actionPending}
            className="rounded border border-navy px-4 py-2 text-sm text-navy hover:bg-navy hover:text-white disabled:opacity-50"
          >
            {action.label}
          </button>
        ))}
        {cancelAction && (
          <button
            onClick={() => handleActionClick(cancelAction)}
            disabled={actionPending}
            className="rounded border border-red-600 px-4 py-2 text-sm text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50"
          >
            {cancelAction.label}
          </button>
        )}
      </div>
      {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}

      <div className="mt-6">
        <h2 className="text-sm font-medium text-gray-700">Items</h2>

        {/* Mobile: cards */}
        <div className="mt-2 space-y-2 sm:hidden">
          {order.lines.map((line) => (
            <div key={line.id} className="rounded border border-gray-200 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-navy">{line.product_name}</span>
                <span className="shrink-0 text-gray-500">×{line.quantity}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-gray-500">
                <span>₹{Number(line.price).toFixed(2)} each</span>
                <span className="font-medium text-navy">₹{Number(line.line_total).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* sm+: table */}
        <table className="mt-2 hidden w-full text-left text-sm sm:table">
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

      <Confirm
        open={confirmCancel}
        title="Cancel Order"
        message={`Are you sure you want to cancel order ${order.order_no}? This cannot be undone.`}
        confirmLabel="Cancel Order"
        danger
        onConfirm={() => runTransition("CANCELLED")}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
