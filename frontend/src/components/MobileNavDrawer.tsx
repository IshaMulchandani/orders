import { Link } from "react-router-dom";

export interface NavItem {
  to: string;
  label: string;
}

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  userLabel: string;
  onLogout: () => void;
}

/**
 * Slide-in mobile navigation drawer — the phone-sized counterpart to
 * the header's inline nav links, which only render on sm+ screens
 * (see AppShell). Large tap targets throughout since this is the
 * primary nav surface on the device most users will actually use.
 */
export default function MobileNavDrawer({ open, onClose, items, userLabel, onLogout }: MobileNavDrawerProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity sm:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] transform flex-col bg-white shadow-lg transition-transform duration-200 sm:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between bg-navy px-4 py-3 text-white">
          <span className="font-semibold">Ordering System</span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-1 flex-col overflow-y-auto py-2">
          <Link to="/orders" onClick={onClose} className="px-4 py-3 text-navy hover:bg-gray-50">
            Orders
          </Link>
          {items.map((item) => (
            <Link key={item.to} to={item.to} onClick={onClose} className="px-4 py-3 text-navy hover:bg-gray-50">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-gray-100 px-4 py-3">
          <p className="text-sm text-gray-500">{userLabel}</p>
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="mt-2 w-full rounded bg-navy px-3 py-2 text-sm text-white hover:bg-navy-light"
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
