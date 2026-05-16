import { Stack } from "expo-router";
import { GuestRoute } from "../../src/components/GuestRoute";

export default function AuthLayout() {
  return (
    <GuestRoute>
      <Stack screenOptions={{ headerShown: false }} />
    </GuestRoute>
  );
}
