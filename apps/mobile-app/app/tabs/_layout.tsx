import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { colors } from "../../src/theme/design";

type TabIconProps = {
  color: string;
  size: number;
};

export default function TabsLayout() {
  return (
    <ProtectedRoute requireProfileComplete>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: { fontSize: 12, fontWeight: "900" },
          tabBarStyle: {
            minHeight: 82,
            borderTopColor: "rgba(191,202,186,0.42)",
            backgroundColor: "rgba(239,253,237,0.94)",
            paddingBottom: 16,
            paddingTop: 10,
          },
        }}
      >
        <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: ({ color, size }: TabIconProps) => <Ionicons color={color} name="home" size={size} /> }} />
        <Tabs.Screen name="supplements" options={{ href: null, title: "Supplements", tabBarIcon: ({ color, size }: TabIconProps) => <Ionicons color={color} name="medkit" size={size} /> }} />
        <Tabs.Screen name="recommendations" options={{ title: "Recs", tabBarIcon: ({ color, size }: TabIconProps) => <Ionicons color={color} name="sparkles" size={size} /> }} />
        <Tabs.Screen name="tracking" options={{ href: null, title: "Track", tabBarIcon: ({ color, size }: TabIconProps) => <Ionicons color={color} name="analytics" size={size} /> }} />
        <Tabs.Screen name="saved" options={{ href: null, title: "Saved", tabBarIcon: ({ color, size }: TabIconProps) => <Ionicons color={color} name="bookmark" size={size} /> }} />
        <Tabs.Screen name="chat" options={{ title: "AI Chat", tabBarIcon: ({ color, size }: TabIconProps) => <Ionicons color={color} name="chatbox-outline" size={size} /> }} />
        <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }: TabIconProps) => <Ionicons color={color} name="person" size={size} /> }} />
      </Tabs>
    </ProtectedRoute>
  );
}
