import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { AppCard, AppTopBar, Badge, EmptyState, ErrorState, LoadingState, PageHeader, RecommendationCard, StatCard } from "../../src/components/ui";
import { getRecommendationRun, saveRecommendationItem, type FeedbackType, type RecommendationItem, submitRecommendationFeedback } from "../../src/features/recommendations/api";
import { colors, spacing } from "../../src/theme/design";

export default function RecommendationDetailScreen() {
  const { runId } = useLocalSearchParams<{ runId: string }>();
  const run = useQuery({
    queryKey: ["recommendation-run", runId],
    queryFn: () => getRecommendationRun(runId),
    enabled: Boolean(runId),
  });

  return (
    <Screen topBar={<AppTopBar />}>
      <View style={{ gap: spacing.lg }}>
        <PageHeader eyebrow="Best complementary foods" title="Recommendation detail" subtitle="Review confidence, warnings, score factors, and the reason each food was selected." />
        {run.data?.items[0]?.matched_supplement ? (
          <AppCard style={{ gap: spacing.sm, backgroundColor: colors.cream }}>
            <Badge label="Supplement selected" tone="orange" />
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }}>{run.data.items[0].matched_supplement.name}</Text>
            <Text style={{ color: colors.muted, lineHeight: 22 }}>Foods below are ranked for nutrient synergy, preference fit, and association-rule support.</Text>
          </AppCard>
        ) : null}
        {run.data?.items[0] ? (
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <StatCard icon="sparkles" label="Confidence" value={`${Math.round(Number(run.data.items[0].confidence_score ?? run.data.items[0].score) * 100)}%`} />
            <StatCard icon="leaf" label="Synergy" tone="orange" value={`${Math.round(Number(run.data.items[0].score_breakdown?.nutrient_synergy_score ?? run.data.items[0].nutrient_score) * 100)}%`} />
          </View>
        ) : null}
        {run.isLoading ? <LoadingState message="Loading recommendations..." /> : null}
        {run.isError ? <ErrorState message="Unable to load this recommendation run." /> : null}
        {run.data ? (
          <AppCard style={{ backgroundColor: colors.warningSoft }}>
            <Text style={{ color: colors.warning, lineHeight: 22, fontWeight: "700" }}>{run.data.disclaimer}</Text>
          </AppCard>
        ) : null}
        {run.data && run.data.items.length === 0 ? (
          <EmptyState icon="restaurant" title="No saved items" message="No recommendation items were saved for this run." />
        ) : null}

        {run.data?.items.map((item) => (
          <ExplainableRecommendationItem key={item.id} item={item} />
        ))}
      </View>
    </Screen>
  );
}

function ExplainableRecommendationItem({ item }: { item: RecommendationItem }) {
  const [status, setStatus] = useState("");
  const feedbackMutation = useMutation({
    mutationFn: submitRecommendationFeedback,
    onError: () => {
      setStatus("Unable to save feedback right now.");
    },
  });
  const saveMutation = useMutation({
    mutationFn: () => saveRecommendationItem(item.id),
    onError: () => {
      setStatus("Unable to save this food right now.");
    },
  });

  const submitFeedback = (feedbackType: FeedbackType) => {
    setStatus("");
    feedbackMutation.mutate(
      {
        recommendation_item_id: item.id,
        food_id: item.food.id,
        feedback_type: feedbackType,
        rating: feedbackType === "liked" || feedbackType === "saved" || feedbackType === "tried" ? 5 : 2,
        comment: `${feedbackType} from recommendation card`,
      },
      {
        onSuccess: () => {
          setStatus(feedbackType === "disliked" || feedbackType === "not_interested" ? "Preference learned. Similar foods will be reduced." : "Preference learned for future recommendations.");
        },
      },
    );
  };

  const saveFood = () => {
    saveMutation.mutate(undefined, {
      onSuccess: () => {
        setStatus("Saved to your foods.");
      },
    });
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <Badge label={`#${item.rank}`} tone="green" />
      <RecommendationCard
        category={item.food.category}
        confidenceLabel={item.confidence_label}
        explanation={item.explanation}
        foodName={item.food.name}
        nutrients={item.tags.length ? item.tags : item.matched_nutrients}
        onFeedback={submitFeedback}
        onSave={saveFood}
        score={Number(item.confidence_score ?? item.score)}
        scoreBreakdown={item.score_breakdown}
        supplementName={item.matched_supplement?.name}
        warnings={item.warnings}
      />
      {status ? <Text style={feedbackMutation.isError || saveMutation.isError ? errorStyle : successStyle}>{status}</Text> : null}
    </View>
  );
}
const successStyle = { color: colors.primary, fontWeight: "800" as const };
const errorStyle = { color: colors.danger, fontWeight: "800" as const };
