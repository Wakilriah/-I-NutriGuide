import { router } from "expo-router";
import { useEffect, type ReactNode } from "react";
import { Text } from "react-native";
import { useAuthStore } from "../stores/auth-store";
import { colors } from "../theme/design";
import { Screen } from "./Screen";

type ProtectedRouteProps = {
  children: ReactNode;
  redirectCompleteProfile?: boolean;
  requireProfileComplete?: boolean;
};

export function ProtectedRoute({ children, redirectCompleteProfile = false, requireProfileComplete = false }: ProtectedRouteProps) {
  const { accessToken, hasHydrated, profileComplete } = useAuthStore();

  useEffect(() => {
    if (hasHydrated && !accessToken) {
      router.replace("/");
    }
    if (hasHydrated && accessToken && redirectCompleteProfile && profileComplete === true) {
      router.replace("/tabs/home");
    }
    if (hasHydrated && accessToken && requireProfileComplete && profileComplete === false) {
      router.replace("/onboarding/profile");
    }
  }, [accessToken, hasHydrated, profileComplete, redirectCompleteProfile, requireProfileComplete]);

  if (!hasHydrated) {
    return (
      <Screen>
        <Text style={{ color: colors.muted, fontWeight: "800", textAlign: "center" }}>Loading session...</Text>
      </Screen>
    );
  }

  if (!accessToken) {
    return (
      <Screen>
        <Text style={{ color: colors.muted, fontWeight: "800", textAlign: "center" }}>Redirecting...</Text>
      </Screen>
    );
  }

  if (requireProfileComplete && profileComplete === null) {
    return (
      <Screen>
        <Text style={{ color: colors.muted, fontWeight: "800", textAlign: "center" }}>Loading profile...</Text>
      </Screen>
    );
  }

  if (requireProfileComplete && profileComplete === false) {
    return (
      <Screen>
        <Text style={{ color: colors.muted, fontWeight: "800", textAlign: "center" }}>Redirecting...</Text>
      </Screen>
    );
  }

  if (redirectCompleteProfile && profileComplete === true) {
    return (
      <Screen>
        <Text style={{ color: colors.muted, fontWeight: "800", textAlign: "center" }}>Redirecting...</Text>
      </Screen>
    );
  }

  return children;
}
