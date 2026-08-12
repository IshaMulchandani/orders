import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/types/user";
import MobileNavDrawer, { type NavItem } from "./MobileNavDrawer";
import NotificationBell from "./NotificationBell";
import NotificationToast from "./NotificationToast";

/**
 * Extra nav links beyond "Orders" (which the brand link already
 * covers), driven by role. Shared by the desktop inline nav and the
 * mobile drawer so the two surfaces can never drift apart — add a
 * link here once and it shows up in both.
 */
function navItemsForRole(role?: Role): NavItem[] {
  const items: NavItem[] = [];
  if (role === "PARTNER" || role === "SALESMAN") {
    items.push({ to: "/orders/new", label: "New Order" });
  }
  if (role === "PARTNER") {
    items.push(
      { to: "/history", label: "History" },
      { to: "/admin/users", label: "Manage Users" },
      { to: "/admin/clients", label: "Manage Clients" },
      { to: "/admin/products", label: "Manage Products" },
    );
  }
  return items;
}

/** Shared authenticated layout: responsive header + page content via <Outlet/>. */
export default function AppShell() {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navItems = navItemsForRole(user?.role);
  const userLabel = `${user?.first_name || user?.email || ""} · ${user?.role ?? ""}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between bg-navy px-3 py-3 text-white sm:px-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded hover:bg-white/10 sm:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link to="/orders" className="font-semibold">
            Ordering System
          </Link>
          <nav className="hidden items-center gap-4 sm:flex">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to} className="text-sm text-navy-accent hover:underline">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <NotificationBell />
          <span className="hidden sm:inline">{userLabel}</span>
          <button
            onClick={() => logout()}
            className="hidden rounded bg-white/10 px-3 py-1 hover:bg-white/20 sm:block"
          >
            Logout
          </button>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <NotificationToast />

      <MobileNavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={navItems}
        userLabel={userLabel}
        onLogout={() => logout()}
      />
    </div>
  );
}
