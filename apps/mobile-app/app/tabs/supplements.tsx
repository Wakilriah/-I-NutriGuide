"use client";

import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { AppTopBar, Badge, EmptyState, ErrorState, LoadingState, SafetyAlertCard } from "../../src/components/ui";
import { listUserSupplements, type UserSupplement } from "../../src/features/supplements/api";
import { cards, colors, radii, spacing, typography } from "../../src/theme/design";

export default function SupplementsScreen() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["user-supplements"],
    queryFn: listUserSupplements,
  });

  const activeCount = data?.filter((item) => item.active).length ?? 0;

  return (
    <Screen topBar={<AppTopBar title="I-NutriGuide" subtitle="My Supplements" />} showAiAssistant>
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={typography.title}>My Supplements</Text>
          <Text style={typography.subtitle}>Manage your daily wellness routine and track food timing context.</Text>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryIcon}>
            <Ionicons color={colors.surface} name="medkit" size={24} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>{activeCount} active</Text>
            <Text style={styles.summaryText}>{data?.length ?? 0} supplements saved</Text>
          </View>
          <Badge label="Safety aware" tone="orange" />
        </View>

        {isLoading ? <LoadingState message="Loading supplements..." /> : null}
        {isError ? <ErrorState message="Unable to load supplements." /> : null}
        {!isLoading && !isError && data?.length === 0 ? <EmptyState icon="medical" title="No supplements yet" message="Add your first supplement to unlock food pairings." /> : null}

        <View style={{ gap: spacing.md }}>
          {data?.map((item) => (
            <SupplementRoutineCard item={item} key={item.id} />
          ))}
        </View>

        <SafetyAlertCard
          message="Supplements are intended to enhance your diet, not replace it. Review timing warnings and consult a healthcare professional for medication or pregnancy concerns."
          title="Safety first"
          tone="info"
        />
      </View>

      <TouchableOpacity accessibilityLabel="Add supplement" onPress={() => router.push("/tabs/supplements-new" as never)} style={styles.fab}>
        <Ionicons color={colors.text} name="add" size={28} />
      </TouchableOpacity>
    </Screen>
  );
}

function SupplementRoutineCard({ item }: { item: UserSupplement }) {
  const guidance = supplementGuidance(item.supplement.name);
  return (
    <TouchableOpacity accessibilityLabel={`Open ${item.supplement.name}`} onPress={() => router.push(`/tabs/supplement-detail/${item.id}` as never)} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.itemIcon, { backgroundColor: guidance.iconBg }]}>
          <Ionicons color={guidance.iconColor} name={guidance.icon} size={23} />
        </View>
        <Badge label={item.time_of_day || "Any time"} tone="orange" />
      </View>

      <Text style={styles.itemTitle}>{item.supplement.name}</Text>
      <Text style={styles.itemDescription}>{item.supplement.description || [item.dose, item.frequency].filter(Boolean).join(" - ") || "Supplement routine"}</Text>

      <View style={styles.metaBlock}>
        <Ionicons color={colors.primary} name="restaurant" size={18} />
        <View style={{ flex: 1 }}>
          <Text style={styles.metaLabel}>Recommended foods</Text>
          <Text style={styles.metaText}>{guidance.foods}</Text>
        </View>
      </View>

      <View style={styles.metaBlock}>
        <Ionicons color={colors.danger} name="ban-outline" size={18} />
        <View style={{ flex: 1 }}>
          <Text style={styles.metaLabel}>Avoid near intake</Text>
          <Text style={styles.metaText}>{guidance.avoid}</Text>
        </View>
      </View>

      <View style={styles.interaction}>
        <Ionicons color={colors.muted} name="information-circle-outline" size={16} />
        <Text style={styles.interactionText}>{guidance.note}</Text>
      </View>
    </TouchableOpacity>
  );
}

function supplementGuidance(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("iron")) {
    return { avoid: "Coffee, tea, and calcium close to intake", foods: "Citrus, lentils, beans, spinach", icon: "water" as const, iconBg: colors.cream, iconColor: colors.secondary, note: "Vitamin C-rich foods may support iron absorption." };
  }
  if (lower.includes("d") || lower.includes("omega")) {
    return { avoid: "Large high-fiber meals if they upset digestion", foods: "Fatty fish, eggs, avocado, walnuts", icon: "sunny" as const, iconBg: colors.primarySoft, iconColor: colors.primary, note: "Fat-containing meals may support absorption for fat-soluble nutrients." };
  }
  if (lower.includes("magnesium")) {
    return { avoid: "High-dose minerals at the same time", foods: "Leafy greens, almonds, beans", icon: "leaf" as const, iconBg: colors.primarySoft, iconColor: colors.primary, note: "Keep timing consistent and review high-dose combinations." };
  }
  return { avoid: "Known personal allergies or flagged interactions", foods: "Balanced meals with protein and plants", icon: "nutrition" as const, iconBg: colors.secondarySoft, iconColor: colors.secondary, note: "Food pairing guidance becomes more precise after recommendations are generated." };
}

const styles = {
  summary: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.primary,
    padding: spacing.lg,
  },
  summaryIcon: {
    width: 50,
    height: 50,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  summaryTitle: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: "900" as const,
  },
  summaryText: {
    color: colors.surfaceOnDark,
    fontSize: 13,
    fontWeight: "800" as const,
    marginTop: 2,
  },
  card: {
    ...cards.default,
    gap: spacing.md,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: spacing.sm,
  },
  itemIcon: {
    width: 54,
    height: 54,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.md,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900" as const,
  },
  itemDescription: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  metaBlock: {
    flexDirection: "row" as const,
    gap: spacing.sm,
  },
  metaLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800" as const,
  },
  metaText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800" as const,
    lineHeight: 19,
  },
  interaction: {
    flexDirection: "row" as const,
    gap: spacing.xs,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.md,
  },
  interactionText: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  fab: {
    position: "absolute" as const,
    right: spacing.lg,
    bottom: 104,
    width: 58,
    height: 58,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.pill,
    backgroundColor: colors.secondaryContainer,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
};
