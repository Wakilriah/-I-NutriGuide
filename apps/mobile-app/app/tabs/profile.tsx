"use client";

import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { AppTopBar, Badge, GenderAvatar, LoadingState } from "../../src/components/ui";
import { getProfile } from "../../src/features/profile/api";
import { useAuthStore } from "../../src/stores/auth-store";
import { cards, colors, radii, spacing } from "../../src/theme/design";

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const profile = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const profileExtras = profile.data as (typeof profile.data & { avatar_url?: string | null; name?: string | null }) | undefined;

  const logout = async () => {
    setIsLoggingOut(true);
    await clearSession();
    router.replace("/");
  };

  return (
    <Screen topBar={<AppTopBar title="I-NutriGuide" subtitle="Profile" />}>
      <View style={{ gap: spacing.xl }}>
        {profile.isLoading ? <LoadingState message="Loading profile..." /> : null}

        <View style={styles.hero}>
          <View style={styles.avatarWrap}>
            <GenderAvatar avatarUrl={profileExtras?.avatar_url} gender={profile.data?.gender} name={profileExtras?.name ?? user?.name} size={122} style={styles.avatarImage} />
            <TouchableOpacity accessibilityLabel="Edit profile" onPress={() => router.push("/tabs/profile-info" as never)} style={styles.editBadge}>
              <Ionicons color={colors.text} name="pencil" size={18} />
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>{user?.name ?? "Your Profile"}</Text>
          <Text style={styles.email}>{user?.email ?? "Manage your wellness preferences"}</Text>
          <Badge label={(profile.data?.goal ?? "general wellness").replaceAll("_", " ")} tone="green" />
        </View>

        <View style={styles.statRow}>
          <ProfileStat label="Weight (kg)" value={profile.data?.weight_kg ?? "--"} tone="green" />
          <ProfileStat label="Activity" value={profile.data?.activity_level?.replaceAll("_", " ") || "Setup"} tone="orange" />
        </View>

        <View style={{ gap: spacing.sm }}>
          <ProfileLink icon="restaurant" label="Dietary Preferences" subtitle={`${profile.data?.diet_type?.replaceAll("_", " ") || "No diet set"}${profile.data?.allergies?.length ? `, ${profile.data.allergies.length} allergies` : ""}`} to="/tabs/profile-info" />
          <ProfileLink icon="bookmark" label="Saved Foods & Recipes" subtitle="Foods you saved from recommendations" to="/tabs/saved" />
          <ProfileLink icon="time" label="Recommendation History" subtitle="View past food and supplement plans" to="/tabs/recommendations" />
          <ProfileLink icon="settings" label="Account Settings" subtitle="Privacy, notifications, and app settings" to="/tabs/profile-settings" />
        </View>

        <TouchableOpacity disabled={isLoggingOut} onPress={logout} style={[styles.logout, isLoggingOut && { opacity: 0.7 }]}>
          {isLoggingOut ? <ActivityIndicator color={colors.danger} /> : <Ionicons color={colors.danger} name="log-out-outline" size={22} />}
          <Text style={styles.logoutText}>{isLoggingOut ? "Logging out..." : "Log Out"}</Text>
        </TouchableOpacity>

        <Text style={styles.version}>v1.2.4 - NutriGuide Intelligence</Text>
      </View>
    </Screen>
  );
}

function ProfileStat({ label, tone, value }: { label: string; tone: "green" | "orange"; value: string | number }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color: tone === "green" ? colors.primary : colors.secondary }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProfileLink({ icon, label, subtitle, to }: { icon: keyof typeof Ionicons.glyphMap; label: string; subtitle: string; to: string }) {
  return (
    <TouchableOpacity onPress={() => router.push(to as never)} style={styles.link}>
      <View style={styles.linkIcon}>
        <Ionicons color={colors.primary} name={icon} size={22} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.linkLabel}>{label}</Text>
        <Text style={styles.linkSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons color={colors.mutedSoft} name="chevron-forward" size={22} />
    </TouchableOpacity>
  );
}

const styles = {
  hero: {
    alignItems: "center" as const,
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  avatarWrap: {
    width: 132,
    height: 132,
    borderColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 5,
    backgroundColor: colors.surface,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },
  avatarImage: {
    width: "100%" as const,
    height: "100%" as const,
    borderRadius: radii.pill,
  },
  editBadge: {
    position: "absolute" as const,
    right: -2,
    bottom: 4,
    width: 42,
    height: 42,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 3,
    backgroundColor: colors.secondaryContainer,
  },
  name: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "900" as const,
    lineHeight: 42,
    textAlign: "center" as const,
  },
  email: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700" as const,
    textAlign: "center" as const,
  },
  statRow: {
    flexDirection: "row" as const,
    gap: spacing.md,
  },
  statCard: {
    ...cards.default,
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    minHeight: 110,
    borderRadius: radii.xl,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "900" as const,
    textTransform: "capitalize" as const,
    textAlign: "center" as const,
  },
  statLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800" as const,
    marginTop: 4,
    textAlign: "center" as const,
  },
  link: {
    ...cards.default,
    minHeight: 92,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.md,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  linkIcon: {
    width: 50,
    height: 50,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  linkLabel: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900" as const,
  },
  linkSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  logout: {
    minHeight: 62,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: spacing.sm,
    borderRadius: radii.xl,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: spacing.md,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 18,
    fontWeight: "900" as const,
  },
  version: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800" as const,
    textAlign: "center" as const,
  },
};
