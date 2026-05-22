import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AdminUser } from "../api/auth";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AdminUser | null;
  setAccessToken: (accessToken: string) => void;
  setSession: (session: { access: string; refresh: string; user: AdminUser }) => void;
  setUser: (user: AdminUser) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAccessToken: (accessToken) => set({ accessToken }),
      setSession: (session) =>
        set({
          accessToken: session.access,
          refreshToken: session.refresh,
          user: session.user,
        }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    {
      name: "inutriguide-admin-auth",
    },
  ),
);
