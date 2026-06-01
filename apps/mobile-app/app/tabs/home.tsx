"use client";

import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { ImageBackground, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { AppButton, AppTopBar, Badge, EmptyState, ErrorState, HomeHeroCard, LoadingState, MacroProgressBar, SafetyAlertCard } from "../../src/components/ui";
import { getProfile } from "../../src/features/profile/api";
import { listRecommendationHistory, queueRecommendationGeneration, resolveFoodImageUri } from "../../src/features/recommendations/api";
import { listUserSupplements } from "../../src/features/supplements/api";
import { getTodayTracking } from "../../src/features/tracking/api";
import { useAuthStore } from "../../src/stores/auth-store";
import { cards, colors, radii, spacing, typography } from "../../src/theme/design";

function toNumber(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const supplements = useQuery({ queryKey: ["user-supplements"], queryFn: listUserSupplements });
  const history = useQuery({ queryKey: ["recommendation-history"], queryFn: listRecommendationHistory });
  const today = useQuery({ queryKey: ["tracking", "today"], queryFn: getTodayTracking });
  const profile = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const latestRun = history.data?.[0];
  const firstName = user?.name?.split(" ")[0] || "there";
  const activeSupplements = supplements.data?.filter((item) => item.active) ?? [];
  const nextSupplement = activeSupplements[0];
  const calorieTarget = profile.data?.goal === "weight_loss" ? 1800 : profile.data?.goal === "muscle" ? 2800 : 2200;
  const proteinTarget = Math.round((toNumber(profile.data?.weight_kg) || 70) * (profile.data?.goal === "muscle" ? 1.8 : 1.2));
  const calories = toNumber(today.data?.calories);
  const protein = toNumber(today.data?.protein_g);
  const currentWater = toNumber(today.data?.water_ml);
  const currentSteps = toNumber(today.data?.steps);

  const generateMutation = useMutation({
    mutationFn: () => queueRecommendationGeneration(10),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["recommendation-history"] });
    },
  });

  return (
    <Screen showAiAssistant topBar={<AppTopBar onAvatarPress={() => router.push("/tabs/profile" as never)} subtitle="Today" />} contentStyle={{ paddingBottom: 132 }}>
      <View style={{ gap: spacing.xl }}>
        <HomeHeroCard
          calories={calories}
          name={firstName}
          nextSupplement={nextSupplement?.supplement.name}
          onPress={() => router.push("/tabs/tracking" as never)}
          steps={currentSteps}
          waterMl={currentWater}
        />

        <View style={styles.nextCard}>
          <View style={styles.nextIcon}>
            <Ionicons color={colors.surface} name="medkit" size={26} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nextKicker}>Next supplement</Text>
            <Text style={styles.nextTitle}>{nextSupplement?.supplement.name ?? "Add your first supplement"}</Text>
            <Text style={styles.nextText}>{nextSupplement ? `${nextSupplement.dose || "Dose not set"} - ${nextSupplement.time_of_day || "Any time"}` : "Build your routine to unlock food timing guidance."}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push(nextSupplement ? "/tabs/supplements" : "/tabs/supplements-new" as never)} style={styles.nextButton}>
            <Ionicons color={colors.primary} name="chevron-forward" size={22} />
          </TouchableOpacity>
        </View>

        <View style={styles.tipCard}>
          <Ionicons color={colors.surface} name="bulb-outline" size={24} />
          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle}>Daily nutrition tip</Text>
            <Text style={styles.tipText}>Pair plant iron foods with vitamin C-rich produce when it fits your profile and allergies.</Text>
          </View>
        </View>

        <SafetyAlertCard message="Recommendations filter allergies and known safety notes before ranking foods. Review timing warnings when they appear." title="Interaction check" />

        <View style={styles.quickGrid}>
          <QuickAction icon="restaurant" label="Log food" to="/tabs/log-food" />
          <QuickAction icon="analytics" label="Track" to="/tabs/tracking" />
          <QuickAction icon="medkit" label="Add supplement" to="/tabs/supplements-new" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={typography.section}>Top recommended foods</Text>
          <TouchableOpacity onPress={() => router.push("/tabs/recommendations" as never)}>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        {history.isLoading ? <LoadingState message="Loading recommendations..." /> : null}
        {history.isError ? <ErrorState message="Unable to load recommendations." /> : null}
        {!history.isLoading && !latestRun ? <EmptyState icon="restaurant" title="No plan yet" message="Generate recommendations to see food matches here." /> : null}
        {latestRun ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.lg }}>
            {latestRun.items.slice(0, 5).map((item) => (
              <TouchableOpacity key={item.id} onPress={() => router.push(`/tabs/recommendation-detail/${item.run_id}` as never)} style={styles.foodCard}>
                <ImageBackground imageStyle={{ borderRadius: radii.xl }} source={{ uri: resolveFoodImageUri(item.food.image_path) }} style={styles.foodImage}>
                  <View style={styles.foodTopRow}>
                    <Badge label={`${Math.round(Number(item.score) * 100)}% match`} tone="green" />
                    <Badge label="Safe" tone={item.warnings.length ? "orange" : "green"} />
                  </View>
                  <View style={styles.foodOverlay}>
                    <Text style={styles.foodTitle}>{item.food.name}</Text>
                    <Text style={styles.foodSub}>{item.matched_supplement ? `With ${item.matched_supplement.name}` : item.food.category}</Text>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.trackingCard}>
          <View style={styles.sectionHeader}>
            <Text style={typography.section}>Today's tracking</Text>
            <Badge label={`${today.data?.food_entries.length ?? 0} foods`} tone="neutral" />
          </View>
          <MacroProgressBar color={colors.primary} label="Calories" target={calorieTarget} unit="kcal" value={calories} />
          <MacroProgressBar color={colors.secondaryContainer} label="Protein" target={proteinTarget} value={protein} />
          <MacroProgressBar color={colors.blue} label="Water" target={2500} unit="ml" value={toNumber(today.data?.water_ml)} />
        </View>

        {!latestRun ? (
          <AppButton disabled={generateMutation.isPending} icon="sparkles" label={generateMutation.isPending ? "Generating..." : "Generate recommendations"} onPress={() => generateMutation.mutate()} />
        ) : null}
      </View>
    </Screen>
  );
}

function QuickAction({ icon, label, to }: { icon: keyof typeof Ionicons.glyphMap; label: string; to: string }) {
  return (
    <TouchableOpacity onPress={() => router.push(to as never)} style={styles.quickAction}>
      <View style={styles.quickIcon}>
        <Ionicons color={colors.primary} name={icon} size={22} />
      </View>
      <Text style={styles.quickText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = {
  greeting: {
    gap: spacing.xs,
  },
  greetingTitle: {
    color: colors.text,
    fontSize: 31,
    fontWeight: "900" as const,
    lineHeight: 38,
  },
  greetingText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  nextCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.primary,
    padding: spacing.lg,
  },
  nextIcon: {
    width: 58,
    height: 58,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.lg,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  nextKicker: {
    color: colors.secondaryContainer,
    fontSize: 12,
    fontWeight: "900" as const,
    textTransform: "uppercase" as const,
  },
  nextTitle: {
    color: colors.surface,
    fontSize: 19,
    fontWeight: "900" as const,
    marginTop: 2,
  },
  nextText: {
    color: colors.surfaceOnDark,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  nextButton: {
    width: 42,
    height: 42,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  tipCard: {
    flexDirection: "row" as const,
    gap: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.primaryContainer,
    padding: spacing.lg,
  },
  tipTitle: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: "900" as const,
  },
  tipText: {
    color: colors.surfaceOnDark,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  quickGrid: {
    flexDirection: "row" as const,
    gap: spacing.sm,
  },
  quickAction: {
    ...cards.default,
    flex: 1,
    minHeight: 94,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  quickIcon: {
    width: 40,
    height: 40,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  quickText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900" as const,
    textAlign: "center" as const,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: spacing.sm,
  },
  viewAll: {
    color: colors.primary,
    fontWeight: "900" as const,
  },
  foodCard: {
    width: 246,
    borderRadius: radii.xl,
    overflow: "hidden" as const,
  },
  foodImage: {
    height: 210,
    justifyContent: "space-between" as const,
    overflow: "hidden" as const,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceContainerHigh,
  },
  foodTopRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    padding: spacing.sm,
  },
  foodOverlay: {
    padding: spacing.md,
    backgroundColor: "rgba(18,29,38,0.48)",
  },
  foodTitle: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: "900" as const,
  },
  foodSub: {
    color: colors.surfaceOnDark,
    fontSize: 12,
    fontWeight: "800" as const,
    marginTop: 3,
  },
  trackingCard: {
    ...cards.default,
    gap: spacing.md,
    borderRadius: radii.xl,
  },
};
