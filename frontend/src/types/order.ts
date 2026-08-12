export type OrderStatus =
  | "PENDING"
  | "BILL_CREATED"
  | "SHIPPED"
  | "PAYMENT_PENDING"
  | "DONE"
  | "CANCELLED";

export interface OrderLine {
  id: number;
  // Nullable: if a Partner hard-deletes the product after this line
  // was created, the FK goes null (see apps.orders.models.OrderLine —
  // on_delete=SET_NULL) but product_name still shows the snapshotted
  // name so the line stays readable.
  product: number | null;
  product_name: string;
  quantity: number;
  price: string;
  line_total: string;
}

export interface OrderEvent {
  id: number;
  kind: "CREATED" | "EDITED" | "STATUS_CHANGE" | "CANCELLED";
  from_status: string;
  to_status: string;
  description: string;
  actor_name: string;
  created_at: string;
}

export interface OrderListItem {
  id: number;
  order_no: string;
  client_name: string;
  salesman_name: string;
  status: OrderStatus;
  total: string;
  created_at: string;
}

export interface OrderAction {
  to_status: OrderStatus;
  label: string;
}

export interface OrderDetail {
  id: number;
  order_no: string;
  client: number;
  client_name: string;
  salesman_name: string;
  status: OrderStatus;
  billed_by_name: string | null;
  lines: OrderLine[];
  events: OrderEvent[];
  total: string;
  can_edit: boolean;
  available_actions: OrderAction[];
  created_at: string;
  updated_at: string;
}

// A single line item as the create/edit form holds it in local state
// — looser than OrderLine since product may be unselected mid-edit.
export interface DraftOrderLine {
  key: string; // stable React key, independent of any server id
  product: { id: number; name: string } | null;
  quantity: string;
  price: string;
}
