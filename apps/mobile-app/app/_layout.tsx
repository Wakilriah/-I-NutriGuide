import { QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "../global.css";
import type { AuthUser } from "../src/features/auth/api";
import { getProfile, isProfileComplete } from "../src/features/profile/api";
import { apiClient } from "../src/lib/api";
import { queryClient } from "../src/lib/query-client";
import { registerForPushNotificationsOnce } from "../src/lib/notifications";
import { loadSession } from "../src/lib/secure-storage";
import { useAuthStore } from "../src/stores/auth-store";

export default function RootLayout() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen;
      if (screen === "tracking") {
        router.push("/tabs/tracking");
      }
    });

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
          void registerForPushNotificationsOnce();
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
      subscription.remove();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
