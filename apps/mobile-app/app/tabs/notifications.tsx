"use client";

import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { AppTopBar, EmptyState, ErrorState, LoadingState, PageHeader } from "../../src/components/ui";
import { listNotifications } from "../../src/features/notifications/api";
import { cards, colors, radii, spacing } from "../../src/theme/design";

const icons = {
  food_reminder: "restaurant",
  supplement_reminder: "medkit",
  recommendation_ready: "sparkles",
  general: "notifications",
} as const;

export default function NotificationsScreen() {
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: listNotifications });

  return (
    <Screen topBar={<AppTopBar title="Notifications" />}>
      <View style={{ gap: spacing.lg }}>
        <PageHeader eyebrow="History" title="Notifications" subtitle="Food reminders, supplement timing, and recommendation updates." />
        {notifications.isLoading ? <LoadingState message="Loading notifications..." /> : null}
        {notifications.isError ? <ErrorState message="Unable to load notifications." /> : null}
        {!notifications.isLoading && notifications.data?.length === 0 ? <EmptyState icon="notifications-outline" title="No notifications yet" message="Reminder and recommendation updates will appear here." /> : null}
        <View style={{ gap: spacing.sm }}>
          {notifications.data?.map((item) => {
            const url = typeof item.data?.url === "string" ? item.data.url.replace("inutriguide://", "/") : "";
            return (
              <TouchableOpacity key={item.id} disabled={!url} onPress={() => router.push(url as never)} style={styles.row}>
                <View style={styles.icon}>
                  <Ionicons color={colors.primary} name={icons[item.notification_type] ?? "notifications"} size={19} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.body}>{item.body}</Text>
                  <Text style={styles.date}>{new Date(item.sent_at).toLocaleString()}</Text>
                </View>
                {url ? <Ionicons color={colors.mutedSoft} name="chevron-forward" size={18} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = {
  row: {
    ...cards.default,
    minHeight: 86,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
    padding: spacing.md,
  },
  icon: {
    width: 42,
    height: 42,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900" as const,
  },
  body: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  date: {
    color: colors.mutedSoft,
    fontSize: 11,
    fontWeight: "800" as const,
    marginTop: 6,
  },
};
