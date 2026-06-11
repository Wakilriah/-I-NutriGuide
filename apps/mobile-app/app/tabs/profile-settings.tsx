"use client";

import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { AppTopBar, PageHeader } from "../../src/components/ui";
import { getPushTokenStatus } from "../../src/features/notifications/api";
import { PushRegistrationError, registerForPushNotificationsOnce } from "../../src/lib/notifications";
import { useAuthStore } from "../../src/stores/auth-store";
import { cards, colors, radii, spacing, typography } from "../../src/theme/design";

export default function ProfileSettingsScreen() {
  const clearSession = useAuthStore((state) => state.clearSession);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<"idle" | "enabling" | "enabled" | "blocked">("idle");
  const [notificationMessage, setNotificationMessage] = useState("Receive reminders even when the app is closed");
  const pushStatus = useQuery({ queryKey: ["push-token-status"], queryFn: getPushTokenStatus });
  const deviceRegistered = pushStatus.data?.registered === true;

  const logout = async () => {
    setIsLoggingOut(true);
    await clearSession();
    router.replace("/");
  };

  return (
    <Screen topBar={<AppTopBar title="Settings" />}>
      <View style={{ gap: spacing.lg }}>
        <PageHeader eyebrow="Account" title="Settings" subtitle="Notification preferences and account actions." />
        <View style={styles.card}>
          <Text style={typography.section}>Notifications</Text>
          <ActionRow
            icon="notifications"
            label={deviceRegistered ? "Push notifications enabled" : "Enable push notifications"}
            onPress={async () => {
              setNotificationStatus("enabling");
              try {
                const enabled = await registerForPushNotificationsOnce({ requestWebPermission: true });
                setNotificationStatus(enabled ? "enabled" : "blocked");
                setNotificationMessage(enabled ? "This device is registered for push notifications" : "Notification permission was not granted");
                await pushStatus.refetch();
              } catch (error) {
                setNotificationStatus("blocked");
                setNotificationMessage(error instanceof PushRegistrationError ? error.message : "Push registration failed. Check your connection and try again.");
              }
            }}
            value={
              notificationStatus === "enabling"
                ? "Requesting permission..."
                : deviceRegistered
                  ? `Server registered: ${pushStatus.data?.platforms.join(", ")}`
                : notificationMessage
            }
          />
          <SettingRow icon="restaurant" label="Food reminders" value="Lunch and evening if no food is logged" />
          <SettingRow icon="medkit" label="Supplement reminders" value="Based on supplement frequency and timing" />
          <SettingRow icon="sparkles" label="Recommendation updates" value="Sent when background generation finishes" />
        </View>
        <View style={styles.card}>
          <Text style={typography.section}>Manage</Text>
          <ActionRow icon="person" label="Edit profile info" onPress={() => router.push("/tabs/profile-info" as never)} value="Body stats, goals, allergies" />
          <ActionRow icon="bar-chart" label="Graphs and statistics" onPress={() => router.push("/tabs/history" as never)} value="Weight, BMI, water, intake history" />
          <ActionRow icon="notifications" label="Notification history" onPress={() => router.push("/tabs/notifications" as never)} value="Past reminders and generated plans" />
        </View>
        <TouchableOpacity disabled={isLoggingOut} onPress={logout} style={[styles.logout, isLoggingOut && { opacity: 0.7 }]}>
          {isLoggingOut ? <ActivityIndicator color={colors.surface} /> : <Ionicons color={colors.surface} name="log-out-outline" size={20} />}
          <Text style={styles.logoutText}>{isLoggingOut ? "Logging out..." : "Log out"}</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

function ActionRow({ icon, label, onPress, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; value: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.row}>
      <View style={styles.icon}>
        <Ionicons color={colors.primary} name={icon} size={18} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      <Ionicons color={colors.mutedSoft} name="chevron-forward" size={18} />
    </TouchableOpacity>
  );
}

function SettingRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.icon}>
        <Ionicons color={colors.primary} name={icon} size={18} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = {
  card: {
    ...cards.default,
    gap: spacing.sm,
    padding: spacing.md,
  },
  row: {
    minHeight: 58,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm,
  },
  icon: {
    width: 36,
    height: 36,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900" as const,
  },
  value: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700" as const,
    marginTop: 2,
  },
  logout: {
    minHeight: 52,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.md,
  },
  logoutText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900" as const,
  },
};
