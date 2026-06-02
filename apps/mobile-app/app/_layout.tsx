import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";
import axios from "axios";
import type { AuthUser } from "../src/features/auth/api";
import { getProfile, isProfileComplete, updateProfile } from "../src/features/profile/api";
import { apiClient } from "../src/lib/api";
import { queryClient } from "../src/lib/query-client";
import { loadSession } from "../src/lib/secure-storage";
import { useAuthStore } from "../src/stores/auth-store";
import { usePushNotifications } from "../src/lib/usePushNotifications";
import { setupUILib } from "../src/theme/ui-lib-config";

setupUILib();

function shouldClearStoredSession(error: unknown) {
  return axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403);
}

export default function RootLayout() {
  const { expoPushToken } = usePushNotifications();
  const accessToken = useAuthStore((state) => state.accessToken);

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
        } catch (error) {
          if (mounted) {
            if (shouldClearStoredSession(error)) {
              await useAuthStore.getState().clearSession();
            } else {
              useAuthStore.getState().setProfileComplete(null);
            }
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

  useEffect(() => {
    if (expoPushToken && accessToken) {
      const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      updateProfile({ expo_push_token: expoPushToken, timezone: deviceTimezone }).catch(console.error);
    }
  }, [expoPushToken, accessToken]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
