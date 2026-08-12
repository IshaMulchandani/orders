// Kept as the single source of truth for the Role type — every
// component that needs role-based rendering imports this instead of
// redefining the string union.
export type Role = "PARTNER" | "SALESMAN" | "ACCOUNTANT" | "PACKAGING";

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  is_active: boolean;
  date_joined: string;
}
