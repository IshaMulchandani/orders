import { useNavigate } from "react-router-dom";
import OrderForm from "@/components/orders/OrderForm";

export default function OrderNew() {
  const navigate = useNavigate();
  return (
    <OrderForm
      mode="create"
      onSaved={(order) => navigate(`/orders/${order.id}`, { replace: true })}
      onCancel={() => navigate("/orders")}
    />
  );
}
