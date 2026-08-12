import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiClient } from "@/api/client";
import { tokenStorage } from "@/api/tokenStorage";
import type { User } from "@/types/user";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Wraps the whole app (see main.tsx). Owns the current user and the
 * login/logout actions — every component reads/acts on auth state
 * through the useAuth() hook below rather than touching tokens or
 * making API calls directly.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const access = tokenStorage.getAccess();
    if (!access) {
      setIsLoading(false);
      return;
    }
    apiClient
      .get<User>("/auth/me/")
      .then((res) => setUser(res.data))
      .catch(() => tokenStorage.clear())
      .finally(() => setIsLoading(false));
  }, []);

  async function loginWithGoogle(idToken: string) {
    const { data } = await apiClient.post("/auth/google/", { id_token: idToken });
    tokenStorage.set(data.access, data.refresh);
    setUser(data.user);
  }

  async function logout() {
    const refresh = tokenStorage.getRefresh();
    try {
      await apiClient.post("/auth/logout/", { refresh });
    } catch {
      // Ignore — we clear local state regardless so the user is
      // logged out client-side even if the backend call fails.
    }
    tokenStorage.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
