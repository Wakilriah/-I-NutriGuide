import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ImageBackground, Text, TouchableOpacity, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { AppButton, AppCard, AppTopBar, Badge, EmptyState, ErrorState, LoadingState, PageHeader } from "../../src/components/ui";
import { getMealPlan, getTimingPlan, listRecommendationHistory, queueRecommendationGeneration, resolveFoodImageUri, resolveRecommendationConfidence, resolveRecommendationSynergy, type RecommendationItem } from "../../src/features/recommendations/api";
import { colors, spacing } from "../../src/theme/design";

export default function RecommendationsScreen() {
  const queryClient = useQueryClient();
  const [pendingAfterRunId, setPendingAfterRunId] = useState<string | null | undefined>(undefined);
  const history = useQuery({
    queryKey: ["recommendation-history"],
    queryFn: listRecommendationHistory,
    refetchInterval: pendingAfterRunId !== undefined ? 3000 : false,
  });
  const timingPlan = useQuery({ queryKey: ["recommendation-timing-plan"], queryFn: getTimingPlan });
  const mealPlan = useQuery({ queryKey: ["recommendation-meal-plan"], queryFn: getMealPlan });
  const generateMutation = useMutation({
    mutationFn: () => queueRecommendationGeneration(10),
    onSuccess: async () => {
      setPendingAfterRunId(history.data?.[0]?.run_id ?? null);
      await queryClient.invalidateQueries({ queryKey: ["recommendation-history"] });
    },
  });

  useEffect(() => {
    if (pendingAfterRunId === undefined) {
      return;
    }
    const latestRunId = history.data?.[0]?.run_id ?? null;
    if (latestRunId !== pendingAfterRunId) {
      setPendingAfterRunId(undefined);
    }
  }, [history.data, pendingAfterRunId]);

  return (
    <Screen showAiAssistant topBar={<AppTopBar title="Recommendations" subtitle="Smart food match" />}>
      <View style={{ gap: spacing.lg }}>
        <PageHeader eyebrow="Smart Food Match" title="Recommendations Hub" subtitle="AI-curated nutrition plans based on your recent biometric goals." />

        <AppButton
          accessibilityLabel="Generate recommendations"
          disabled={generateMutation.isPending}
          icon="sparkles"
          label={generateMutation.isPending ? "Queueing..." : "Generate in background"}
          onPress={() => generateMutation.mutate()}
        />
        {generateMutation.isSuccess ? (
          <AppCard style={{ backgroundColor: colors.primarySoft }}>
            <Text style={{ color: colors.primary, fontWeight: "900", lineHeight: 21 }}>Recommendation generation started. You can leave this screen; a notification will arrive when the plan is ready.</Text>
          </AppCard>
        ) : null}
        {generateMutation.isError ? <ErrorState message="Unable to generate recommendations. Please try again." /> : null}

        {timingPlan.data?.items?.length ? (
          <AppCard style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>Today's Supplement Plan</Text>
                <Text style={{ color: colors.muted, marginTop: 3 }}>Food timing and avoid notes for absorption.</Text>
              </View>
              <Badge label="Timing" tone="orange" />
            </View>
            {timingPlan.data.items.slice(0, 3).map((item) => (
              <View key={item.supplement.slug} style={{ gap: 4 }}>
                <Text style={{ color: colors.text, fontWeight: "900" }}>{readable(item.best_time)} - {item.supplement.name}</Text>
                <Text style={{ color: colors.muted, lineHeight: 20 }}>{item.explanation}</Text>
                {item.avoid_near_intake.length ? <Text style={{ color: colors.warning, fontWeight: "800" }}>Avoid near intake: {item.avoid_near_intake.join(", ")}</Text> : null}
              </View>
            ))}
          </AppCard>
        ) : null}

        {mealPlan.data?.meals ? (
          <AppCard style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>Daily Plan</Text>
                <Text style={{ color: colors.muted, marginTop: 3 }}>Simple meals built from safe complementary foods.</Text>
              </View>
              <Badge label="Meals" tone="green" />
            </View>
            {Object.values(mealPlan.data.meals).map((meal) => (
              <View key={meal.slot} style={{ gap: 3 }}>
                <Text style={{ color: colors.text, fontWeight: "900" }}>{readable(meal.slot)}</Text>
                <Text style={{ color: colors.muted, lineHeight: 20 }}>{meal.foods[0]?.food_name ?? meal.foods[0]?.food?.name ?? "Complete your profile"} - {meal.explanation}</Text>
              </View>
            ))}
          </AppCard>
        ) : null}

        {history.isLoading ? <LoadingState message="Loading history..." /> : null}
        {history.isError ? <ErrorState message="Unable to load recommendation history." /> : null}
        {!history.isLoading && !history.isError && history.data?.length === 0 ? (
          <EmptyState icon="restaurant" title="No recommendations generated yet." message="Generate your first supplement-aware food list." />
        ) : null}

        <View style={{ gap: spacing.md }}>
          {history.data?.map((run) => {
            const first = run.items[0];
            return (
            <TouchableOpacity accessibilityLabel={`Open recommendation run ${run.run_id}`} key={run.run_id} onPress={() => router.push(`/tabs/recommendation-detail/${run.run_id}` as never)}>
              <AppCard style={{ gap: spacing.md, borderRadius: 24, padding: spacing.sm }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>{run.items.length} food recommendations</Text>
                    <Text style={{ color: colors.muted, marginTop: 3 }}>{new Date(run.created_at).toLocaleString()}</Text>
                  </View>
                  <Text style={{ color: colors.primary, fontWeight: "900" }}>View</Text>
                </View>
                {first?.food ? (
                  <View style={{ gap: spacing.sm }}>
                    <ImageBackground
                      imageStyle={{ borderRadius: 22 }}
                      source={{ uri: resolveFoodImageUri(first.food.image_path) }}
                      style={{
                        height: 178,
                        justifyContent: "space-between",
                        borderRadius: 22,
                        overflow: "hidden",
                        backgroundColor: colors.surfaceContainerHigh,
                      }}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", padding: spacing.sm }}>
                        <Badge label={`${Math.round(Number(first.score) * 100)}% match`} tone="green" />
                        <Badge label={`${Math.round(resolveRecommendationConfidence(first) * 100)}% confidence`} tone="orange" />
                      </View>
                      <View style={{ backgroundColor: "rgba(18,29,38,0.48)", padding: spacing.md }}>
                        <Text style={{ color: colors.surface, fontSize: 22, fontWeight: "900", lineHeight: 28 }}>{first.food.name}</Text>
                        <Text style={{ color: colors.surfaceOnDark, marginTop: 2 }}>{first.food.category}</Text>
                      </View>
                    </ImageBackground>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                      <Badge label={`${Math.round(resolveRecommendationSynergy(first) * 100)}% synergy`} tone="neutral" />
                      {first.matched_supplement ? <Badge label={`With ${first.matched_supplement.name}`} tone="orange" /> : null}
                    </View>
                    <View style={{ borderRadius: 18, backgroundColor: colors.surfaceContainerLow, padding: spacing.md }}>
                      <Text style={{ color: colors.primary, fontWeight: "900", marginBottom: 3 }}>Why this plan</Text>
                      <Text style={{ color: colors.text, lineHeight: 21 }}>{recommendationSummary(first)}</Text>
                    </View>
                  </View>
                ) : null}
              </AppCard>
            </TouchableOpacity>
          );
          })}
        </View>
      </View>
    </Screen>
  );
}

function readable(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function recommendationSummary(item: RecommendationItem) {
  if (typeof item.explanation === "string") {
    return item.explanation;
  }
  return item.explanation?.summary || item.food.synergy_reason || "Matched to your supplement profile, safety filters, and food preferences.";
}
