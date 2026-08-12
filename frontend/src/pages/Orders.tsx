import { Link } from "react-router-dom";
import OrderQueue, { type OrderQueueTab } from "@/components/orders/OrderQueue";
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/types/user";

const ACCOUNTANT_ACTIVE_STATUSES = ["PENDING", "PAYMENT_PENDING"];

const TABS_BY_ROLE: Record<Role, OrderQueueTab[]> = {
  PARTNER: [
    { label: "Pending", match: (o) => o.status === "PENDING" },
    { label: "Bill Created", match: (o) => o.status === "BILL_CREATED" },
    { label: "Payment Pending", match: (o) => o.status === "PAYMENT_PENDING" },
    { label: "All", match: () => true },
  ],
  SALESMAN: [{ label: "My Orders", match: () => true }],
  ACCOUNTANT: [
    { label: "To Bill", match: (o) => o.status === "PENDING" },
    { label: "To Verify Payment", match: (o) => o.status === "PAYMENT_PENDING" },
    { label: "History", match: (o) => !ACCOUNTANT_ACTIVE_STATUSES.includes(o.status) },
  ],
  PACKAGING: [
    { label: "To Ship", match: (o) => o.status === "BILL_CREATED" },
    { label: "History", match: (o) => o.status !== "BILL_CREATED" },
  ],
};

/** Thin, role-aware wrapper around OrderQueue — see TABS_BY_ROLE for what each role sees. */
export default function Orders() {
  const { user } = useAuth();
  const canCreate = user?.role === "PARTNER" || user?.role === "SALESMAN";
  const tabs: OrderQueueTab[] = user ? TABS_BY_ROLE[user.role] : [{ label: "Orders", match: () => true }];

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
        <OrderQueue tabs={tabs} />
      </div>
    </div>
  );
}
