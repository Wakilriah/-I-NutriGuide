import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "../global.css";
import type { AuthUser } from "../src/features/auth/api";
import { getProfile, isProfileComplete } from "../src/features/profile/api";
import { apiClient } from "../src/lib/api";
import { queryClient } from "../src/lib/query-client";
import { loadSession } from "../src/lib/secure-storage";
import { useAuthStore } from "../src/stores/auth-store";

export default function RootLayout() {
  useEffect(() => {
    let mounted = true;

    async function hydrateAuth() {
      try {
        const session = await loadSession();
        if (!mounted) {
          return;
        }

        if (!session) {
          useAuthStore.getState().finishHydration();
          return;
        }

        useAuthStore.getState().hydrateSession(session);

        try {
          const response = await apiClient.get<AuthUser>("/auth/me/");
          if (mounted) {
            useAuthStore.getState().setUser(response.data);
          }
          const profile = await getProfile();
          if (mounted) {
            useAuthStore.getState().setProfileComplete(isProfileComplete(profile));
          }
        } catch {
          if (mounted) {
            await useAuthStore.getState().clearSession();
          }
        }
      } finally {
        if (mounted) {
          useAuthStore.getState().finishHydration();
        }
      }
    }

    void hydrateAuth();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
