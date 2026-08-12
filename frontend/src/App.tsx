import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Orders from "./pages/Orders";

// Route list mirrors PLAN.md section 6. Pages beyond Login/Orders
// (OrderDetail, History, admin/*, notifications) are added phase by
// phase — this file just needs a new <Route> line each time, nothing
// else changes, since layout/nav is shared via a future <AppShell>.
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/" element={<Navigate to="/orders" replace />} />
    </Routes>
  );
}
