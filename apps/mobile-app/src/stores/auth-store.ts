import { create } from "zustand";
import type { AuthSession, AuthUser } from "../features/auth/api";
import { deleteSession, saveSession, type StoredSession } from "../lib/secure-storage";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  hasHydrated: boolean;
  profileComplete: boolean | null;
  hydrateSession: (session: StoredSession) => void;
  finishHydration: () => void;
  setProfileComplete: (profileComplete: boolean | null) => void;
  setUser: (user: AuthUser | null) => void;
  setSession: (session: AuthSession) => Promise<void>;
  updateAccessToken: (accessToken: string) => Promise<void>;
  clearSession: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hasHydrated: false,
  profileComplete: null,
  hydrateSession: (session) => {
    set({ accessToken: session.access, refreshToken: session.refresh });
  },
  finishHydration: () => {
    set({ hasHydrated: true });
  },
  setProfileComplete: (profileComplete) => {
    set({ profileComplete });
  },
  setUser: (user) => {
    set({ user });
  },
  setSession: async (session) => {
    await saveSession({ access: session.access, refresh: session.refresh });
    set({ accessToken: session.access, refreshToken: session.refresh, user: session.user, hasHydrated: true, profileComplete: null });
  },
  updateAccessToken: async (accessToken) => {
    const state = useAuthStore.getState();
    if (!state.refreshToken) {
      return;
    }
    await saveSession({ access: accessToken, refresh: state.refreshToken });
    set({ accessToken, refreshToken: state.refreshToken });
  },
  clearSession: async () => {
    await deleteSession();
    set({ accessToken: null, refreshToken: null, user: null, hasHydrated: true, profileComplete: null });
  },
}));
