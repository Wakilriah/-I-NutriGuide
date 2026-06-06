import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MobileAppShell } from "../../src/components/MobileAppShell";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { colors, dockShadow, radii, spacing } from "../../src/theme/design";

type TabIconProps = {
  color: string;
  size: number;
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <ProtectedRoute requireProfileComplete>
      <MobileAppShell>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveBackgroundColor: "transparent",
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.muted,
            tabBarIconStyle: { marginTop: 0 },
            tabBarLabelStyle: { fontSize: 11, fontWeight: "900", lineHeight: 14, marginBottom: 0, marginTop: 0 },
            tabBarItemStyle: {
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radii.pill,
              marginHorizontal: 2,
              marginVertical: 5,
              paddingVertical: 0,
              backgroundColor: "transparent",
            },
            tabBarStyle: {
              height: 70 + (Platform.OS === "web" ? 0 : insets.bottom),
              marginHorizontal: Platform.OS === "web" ? 18 : spacing.sm,
              marginBottom: Platform.OS === "web" ? 18 : 0,
              borderColor: colors.borderSoft,
              borderRadius: Platform.OS === "web" ? 30 : radii.lg,
              borderTopWidth: 1,
              borderWidth: 1,
              backgroundColor: colors.surface,
              paddingBottom: Platform.OS === "web" ? 8 : Math.max(insets.bottom, 8),
              paddingTop: 8,
              ...dockShadow,
            },
          }}
        >
          <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: ({ color, size }: TabIconProps) => <Ionicons color={color} name="home" size={size} /> }} />
          <Tabs.Screen name="tracking" options={{ title: "Track", tabBarIcon: ({ color, size }: TabIconProps) => <Ionicons color={color} name="analytics" size={size} /> }} />
          <Tabs.Screen name="recommendations" options={{ title: "Recs", tabBarIcon: ({ color, size }: TabIconProps) => <Ionicons color={color} name="restaurant" size={size} /> }} />
          <Tabs.Screen name="supplements" options={{ title: "Supps", tabBarIcon: ({ color, size }: TabIconProps) => <Ionicons color={color} name="medkit" size={size} /> }} />
          <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }: TabIconProps) => <Ionicons color={color} name="person" size={size} /> }} />
          <Tabs.Screen name="chat" options={{ href: null }} />
          <Tabs.Screen name="log-food" options={{ href: null }} />
          <Tabs.Screen name="history" options={{ href: null }} />
          <Tabs.Screen name="saved" options={{ href: null, title: "Saved", tabBarIcon: ({ color, size }: TabIconProps) => <Ionicons color={color} name="bookmark" size={size} /> }} />
          <Tabs.Screen name="notifications" options={{ href: null }} />
          <Tabs.Screen name="supplements-new" options={{ href: null }} />
          <Tabs.Screen name="supplement-detail/[id]" options={{ href: null }} />
          <Tabs.Screen name="recommendation-detail/[runId]" options={{ href: null }} />
          <Tabs.Screen name="profile-info" options={{ href: null }} />
          <Tabs.Screen name="profile-settings" options={{ href: null }} />
        </Tabs>
      </MobileAppShell>
    </ProtectedRoute>
  );
}
