import type { OrderStatus } from "@/types/order";

const STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  BILL_CREATED: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  PAYMENT_PENDING: "bg-orange-100 text-orange-800",
  DONE: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-200 text-gray-600",
};

const LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  BILL_CREATED: "Bill Created",
  SHIPPED: "Shipped",
  PAYMENT_PENDING: "Payment Pending",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

/** Color-coded status badge — reused in the order list, order detail header, and (Phase 5) notifications. */
export default function OrderStatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
