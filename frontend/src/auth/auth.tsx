import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiFetch, setToken, clearToken, getToken } from "@/src/api/client";

export type Role = "owner" | "warehouse" | "accounting" | "employee";

export interface User {
  id: string;
  username: string;
  role: Role;
  full_name: string;
  position?: string;
  salary?: number | null;
  phone?: string;
  email?: string;
  address?: string;
  ktp?: string;
  contract?: string;
  join_date?: string;
  status?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export const roleHome: Record<Role, string> = {
  owner: "/(owner)",
  warehouse: "/(warehouse)",
  accounting: "/(accounting)",
  employee: "/(karyawan)",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const me = await apiFetch<User>("/me");
      setUser(me);
    } catch {
      await clearToken();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiFetch<{ access_token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    await setToken(res.access_token);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    await clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
