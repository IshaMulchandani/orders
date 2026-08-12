import { Link, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import RoleGate from "./RoleGate";

/** Shared authenticated layout: top nav + page content via <Outlet/>. */
export default function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between bg-navy px-4 py-3 text-white">
        <div className="flex items-center gap-4">
          <Link to="/orders" className="font-semibold">
            Ordering System
          </Link>
          <RoleGate allow={["PARTNER"]}>
            <Link to="/admin/users" className="text-sm text-navy-accent hover:underline">
              Manage Users
            </Link>
            <Link to="/admin/clients" className="text-sm text-navy-accent hover:underline">
              Manage Clients
            </Link>
            <Link to="/admin/products" className="text-sm text-navy-accent hover:underline">
              Manage Products
            </Link>
          </RoleGate>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span>
            {user?.first_name || user?.email} · {user?.role}
          </span>
          <button
            onClick={() => logout()}
            className="rounded bg-white/10 px-3 py-1 hover:bg-white/20"
          >
            Logout
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
