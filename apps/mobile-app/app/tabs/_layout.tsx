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
          tabBarLabelStyle: { fontSize: 12, fontWeight: "800" },
          tabBarStyle: {
            minHeight: 68,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
            paddingBottom: 10,
            paddingTop: 8,
          },
        }}
      >
        <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: ({ color, size }: TabIconProps) => <Ionicons color={color} name="home" size={size} /> }} />
        <Tabs.Screen name="supplements" options={{ title: "Supplements", tabBarIcon: ({ color, size }: TabIconProps) => <Ionicons color={color} name="medkit" size={size} /> }} />
        <Tabs.Screen name="recommendations" options={{ title: "Recommendations", tabBarIcon: ({ color, size }: TabIconProps) => <Ionicons color={color} name="restaurant" size={size} /> }} />
        <Tabs.Screen name="saved" options={{ title: "Saved", tabBarIcon: ({ color, size }: TabIconProps) => <Ionicons color={color} name="bookmark" size={size} /> }} />
        <Tabs.Screen name="chat" options={{ title: "Chat", tabBarIcon: ({ color, size }: TabIconProps) => <Ionicons color={color} name="chatbubble-ellipses" size={size} /> }} />
        <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }: TabIconProps) => <Ionicons color={color} name="person" size={size} /> }} />
      </Tabs>
    </ProtectedRoute>
  );
}
