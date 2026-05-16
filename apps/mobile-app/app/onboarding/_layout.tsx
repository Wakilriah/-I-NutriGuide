import { Stack } from "expo-router";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";

export default function OnboardingLayout() {
  return (
    <ProtectedRoute redirectCompleteProfile>
      <Stack screenOptions={{ headerShown: false }} />
    </ProtectedRoute>
  );
}
