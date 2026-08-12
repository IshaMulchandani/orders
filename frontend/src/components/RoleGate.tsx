import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/types/user";

interface RoleGateProps {
  allow: Role[];
  children: ReactNode;
}

/** Conditionally renders children only if the current user's role is in `allow`. */
export default function RoleGate({ allow, children }: RoleGateProps) {
  const { user } = useAuth();
  if (!user || !allow.includes(user.role)) return null;
  return <>{children}</>;
}
