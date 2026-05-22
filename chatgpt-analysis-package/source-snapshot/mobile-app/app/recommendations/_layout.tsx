import { Stack } from "expo-router";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";

export default function RecommendationsLayout() {
  return (
    <ProtectedRoute requireProfileComplete>
      <Stack screenOptions={{ headerShown: false }} />
    </ProtectedRoute>
  );
}
