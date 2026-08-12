import type { OrderEvent } from "@/types/order";

const KIND_LABELS: Record<OrderEvent["kind"], string> = {
  CREATED: "Created",
  EDITED: "Edited",
  STATUS_CHANGE: "Status changed",
  CANCELLED: "Cancelled",
};

/** Renders an order's audit trail (apps.orders.models.OrderEvent) as a vertical timeline. */
export default function OrderTimeline({ events }: { events: OrderEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-gray-400">No activity yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="border-l-2 border-navy-accent pl-3">
          <p className="text-sm font-medium text-navy">
            {KIND_LABELS[event.kind]}
            {event.to_status && ` → ${event.to_status.replace("_", " ")}`}
          </p>
          {event.description && <p className="text-sm text-gray-600">{event.description}</p>}
          <p className="text-xs text-gray-400">
            {event.actor_name} · {new Date(event.created_at).toLocaleString()}
          </p>
        </li>
      ))}
    </ol>
  );
}
