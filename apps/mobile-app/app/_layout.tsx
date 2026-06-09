import { QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";
import axios from "axios";
import type { AuthUser } from "../src/features/auth/api";
import { getProfile, isProfileComplete } from "../src/features/profile/api";
import { apiClient } from "../src/lib/api";
import { registerForPushNotificationsOnce } from "../src/lib/notifications";
import { queryClient } from "../src/lib/query-client";
import { loadSession } from "../src/lib/secure-storage";
import { useAuthStore } from "../src/stores/auth-store";
import { setupUILib } from "../src/theme/ui-lib-config";

setupUILib();

function shouldClearStoredSession(error: unknown) {
  return axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403);
}

export default function RootLayout() {
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    const openNotification = (response: Notifications.NotificationResponse | null) => {
      if (!response) {
        return;
      }
      const data = response.notification.request.content.data;
      const url = data?.url;
      if (typeof url === "string") {
        router.push(url.replace("inutriguide://", "/") as never);
        return;
      }
      const screen = data?.screen;
      if (screen === "tracking") {
        router.push("/tabs/tracking");
      }
    };
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotification(response);
    });
    void Notifications.getLastNotificationResponseAsync().then(async (response) => {
      openNotification(response);
      if (response) {
        await Notifications.clearLastNotificationResponseAsync();
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
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (accessToken) {
      registerForPushNotificationsOnce().catch(console.error);
    }
  }, [accessToken]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
