"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth as authApi } from "./api";
import type { User } from "./types";

export type AuthUser = User;

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
};

const STORAGE_KEY = "nuvo_auth_user_v1";

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw);
        const role = parsed?.role;
        const isCanonicalRole =
          role === "CLINIC_ADMIN" || role === "SLP" || role === "PARENT" || role === "STUDENT";

        if (isCanonicalRole && parsed?.id && parsed?.clinic_id && parsed?.email) {
          setUser(parsed as AuthUser);
          return;
        }

        // Clear legacy user shapes that cannot be re-hydrated without password.
        if (typeof parsed?.email === "string" && parsed.email) {
          localStorage.removeItem(STORAGE_KEY);
        }

        localStorage.removeItem(STORAGE_KEY);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    if (!email) throw new Error("Please enter an email.");
    const u = await authApi.login(email, password);
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    return u;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}

/**
 * Convenience helpers for RBAC checks
 */
export function canAccessAdmin(user: AuthUser | null) {
  return !!user && user.role === "CLINIC_ADMIN";
}

export function canAccessApp(user: AuthUser | null) {
  return !!user && (user.role === "CLINIC_ADMIN" || user.role === "SLP");
}
