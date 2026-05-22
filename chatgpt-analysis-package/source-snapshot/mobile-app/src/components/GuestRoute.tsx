import { router } from "expo-router";
import { useEffect, type ReactNode } from "react";
import { Text } from "react-native";
import { useAuthStore } from "../stores/auth-store";
import { colors } from "../theme/design";
import { Screen } from "./Screen";

type GuestRouteProps = {
  children: ReactNode;
};

export function GuestRoute({ children }: GuestRouteProps) {
  const { accessToken, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (hasHydrated && accessToken) {
      router.replace("/tabs/home");
    }
  }, [accessToken, hasHydrated]);

  if (!hasHydrated) {
    return (
      <Screen>
        <Text style={{ color: colors.muted, fontWeight: "800", textAlign: "center" }}>Loading session...</Text>
      </Screen>
    );
  }

  if (accessToken) {
    return (
      <Screen>
        <Text style={{ color: colors.muted, fontWeight: "800", textAlign: "center" }}>Redirecting...</Text>
      </Screen>
    );
  }

  return children;
}
