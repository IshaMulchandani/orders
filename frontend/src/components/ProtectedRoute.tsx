import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/types/user";

interface ProtectedRouteProps {
  /** If omitted, any authenticated user passes. */
  allowedRoles?: Role[];
}

/**
 * Layout-route guard. Nest routes under it (see App.tsx) instead of
 * wrapping each page individually — that's what makes it reusable
 * across every protected area, including role-restricted ones like
 * /admin/*.
 */
export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/orders" replace />;
  }

  return <Outlet />;
}
