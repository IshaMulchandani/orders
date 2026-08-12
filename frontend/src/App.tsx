import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminClients from "./pages/admin/Clients";
import AdminProducts from "./pages/admin/Products";
import AdminUsers from "./pages/admin/Users";
import History from "./pages/History";
import Login from "./pages/Login";
import OrderDetail from "./pages/OrderDetail";
import OrderNew from "./pages/OrderNew";
import Orders from "./pages/Orders";

// New pages are added as their own <Route> line — nest under the
// relevant <ProtectedRoute allowedRoles={...}> block for role-restricted
// pages, or directly under <AppShell> for anything any signed-in user
// can see. Nothing else in this file needs to change.
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />

          <Route element={<ProtectedRoute allowedRoles={["PARTNER", "SALESMAN"]} />}>
            <Route path="/orders/new" element={<OrderNew />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["PARTNER"]} />}>
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/clients" element={<AdminClients />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/history" element={<History />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/orders" replace />} />
    </Routes>
  );
}
