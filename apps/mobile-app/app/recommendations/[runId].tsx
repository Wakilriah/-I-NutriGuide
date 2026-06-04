import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ImageBackground, Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { AppButton, AppCard, AppTopBar, Badge, EmptyState, ErrorState, LoadingState, PageHeader, ProgressRing, RecommendationCard, StatCard } from "../../src/components/ui";
import { getRecommendationRun, resolveFoodImageUri, saveRecommendationItem, type FeedbackType, type RecommendationItem, submitRecommendationFeedback } from "../../src/features/recommendations/api";
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
        <PageHeader eyebrow="Why this food?" title="Recommendation detail" subtitle="Review match strength, supplement connection, nutrient synergy, and safety notes." />
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <AppButton icon="home" label="Home" onPress={() => router.push("/tabs/home" as never)} variant="ghost" />
          <AppButton icon="sparkles" label="Recommendations" onPress={() => router.push("/tabs/recommendations" as never)} variant="secondary" />
        </View>
        {run.data?.items[0]?.matched_supplement ? (
          <AppCard style={{ gap: spacing.sm, backgroundColor: colors.cream }}>
            <Badge label="Supplement selected" tone="orange" />
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }}>{run.data.items[0].matched_supplement.name}</Text>
            <Text style={{ color: colors.muted, lineHeight: 22 }}>Foods below are ranked for nutrient synergy, preference fit, and association-rule support.</Text>
          </AppCard>
        ) : null}
        {run.data?.items[0] ? (
          <AppCard style={{ gap: spacing.md, borderRadius: 24, padding: spacing.sm }}>
            <ImageBackground
              imageStyle={{ borderRadius: 22 }}
              source={{ uri: resolveFoodImageUri(run.data.items[0].food.image_path) }}
              style={{ height: 188, justifyContent: "flex-end", overflow: "hidden", borderRadius: 22, backgroundColor: colors.surfaceContainerHigh }}
            >
              <View style={{ backgroundColor: "rgba(18,29,38,0.46)", padding: spacing.md }}>
                <Badge label="Top recommendation" tone="green" />
                <Text style={{ color: colors.surface, fontSize: 26, fontWeight: "900", lineHeight: 32, marginTop: spacing.xs }}>{run.data.items[0].food.name}</Text>
                <Text style={{ color: colors.surfaceOnDark, marginTop: 2 }}>{run.data.items[0].food.category}</Text>
              </View>
            </ImageBackground>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <View style={{ alignItems: "center", justifyContent: "center", flex: 1, minWidth: 140 }}>
                <ProgressRing color={colors.primary} label="match" progress={Number(run.data.items[0].score)} value={`${Math.round(Number(run.data.items[0].score) * 100)}%`} />
              </View>
              <StatCard icon="sparkles" label="Match" value={`${Math.round(Number(run.data.items[0].score) * 100)}%`} />
              <StatCard icon="analytics" label="Confidence" value={`${Math.round(Number(run.data.items[0].confidence_score ?? run.data.items[0].score) * 100)}%`} />
              <StatCard icon="leaf" label="Synergy" tone="orange" value={`${Math.round(Number(run.data.items[0].score_breakdown?.nutrient_synergy_score ?? run.data.items[0].nutrient_score) * 100)}%`} />
            </View>
          </AppCard>
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
        rating: ["liked", "saved", "tried", "already_tried", "good_recommendation"].includes(feedbackType) ? 5 : 2,
        comment: `${feedbackType} from recommendation card`,
      },
      {
        onSuccess: () => {
          setStatus(["disliked", "not_interested", "allergy_issue", "do_not_eat"].includes(feedbackType) ? "Preference learned. Similar foods will be reduced or blocked." : "Preference learned for future recommendations.");
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
        confidenceScore={Number(item.confidence_score ?? item.score)}
        confidenceLabel={item.confidence_label}
        explanation={item.explanation}
        fallbackImage={{ uri: resolveFoodImageUri() }}
        foodName={item.food.name}
        image={{ uri: resolveFoodImageUri(item.food.image_path) }}
        imageAlt={item.food.image_alt}
        matchedRules={item.matched_rules}
        nutrients={item.tags.length ? item.tags : item.matched_nutrients}
        onFeedback={submitFeedback}
        onSave={saveFood}
        score={Number(item.score)}
        scoreBreakdown={item.score_breakdown}
        synergyReason={item.food.synergy_reason}
        supplementName={item.matched_supplement?.name}
        warnings={item.warnings}
      />
      {item.alternatives?.length ? (
        <AppCard style={{ gap: spacing.sm, borderRadius: 24 }}>
          <Text style={{ color: colors.text, fontWeight: "900" }}>Alternatives</Text>
          {item.alternatives.slice(0, 4).map((alternative) => (
            <View key={alternative.slug} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <ImageBackground
                imageStyle={{ borderRadius: 16 }}
                source={{ uri: resolveFoodImageUri(alternative.image_path) }}
                style={{ width: 72, height: 72, overflow: "hidden", borderRadius: 16, backgroundColor: colors.surfaceContainerHigh }}
              />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: colors.text, fontWeight: "900" }}>{alternative.name}</Text>
                {alternative.reason ? <Text style={{ color: colors.muted, lineHeight: 19 }}>{alternative.reason}</Text> : null}
              </View>
              {typeof alternative.match_score === "number" ? <Badge label={`${Math.round(alternative.match_score * 100)}%`} tone="neutral" /> : null}
            </View>
          ))}
        </AppCard>
      ) : null}
      {status ? <Text style={feedbackMutation.isError || saveMutation.isError ? errorStyle : successStyle}>{status}</Text> : null}
    </View>
  );
}
const successStyle = { color: colors.primary, fontWeight: "800" as const };
const errorStyle = { color: colors.danger, fontWeight: "800" as const };
