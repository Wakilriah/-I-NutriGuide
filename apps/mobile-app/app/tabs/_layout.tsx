import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MobileAppShell } from "../../src/components/MobileAppShell";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { colors, dockShadow, radii } from "../../src/theme/design";

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
            tabBarActiveBackgroundColor: colors.primary,
            tabBarActiveTintColor: colors.surface,
            tabBarInactiveTintColor: colors.muted,
            tabBarLabelStyle: { fontSize: 11, fontWeight: "900", marginTop: 2 },
            tabBarItemStyle: {
              borderRadius: radii.pill,
              marginHorizontal: 3,
              marginVertical: 9,
              paddingVertical: 4,
            },
            tabBarStyle: {
              position: "absolute",
              left: 18,
              right: 18,
              bottom: Platform.OS === "web" ? 18 : Math.max(insets.bottom, 14),
              height: 72,
              borderColor: colors.borderSoft,
              borderRadius: 30,
              borderTopWidth: 0,
              borderWidth: 1,
              backgroundColor: colors.surface,
              paddingBottom: 8,
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
