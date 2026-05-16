import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { z } from "zod";
import { Screen } from "../../src/components/Screen";
import { AppButton, AppCard, AppInput, Badge, EmptyState, ErrorState, LoadingState, NutrientCard, PageHeader, RecommendationActions, RecommendationCard, StatCard } from "../../src/components/ui";
import { getRecommendationRun, saveRecommendationItem, type RecommendationItem, submitRecommendationFeedback } from "../../src/features/recommendations/api";
import { colors, spacing } from "../../src/theme/design";

const feedbackSchema = z.object({
  rating: z.string().regex(/^[1-5]$/, "Rating must be 1 to 5."),
  comment: z.string(),
});

type FeedbackValues = z.infer<typeof feedbackSchema>;

export default function RecommendationDetailScreen() {
  const { runId } = useLocalSearchParams<{ runId: string }>();
  const run = useQuery({
    queryKey: ["recommendation-run", runId],
    queryFn: () => getRecommendationRun(runId),
    enabled: Boolean(runId),
  });

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <PageHeader eyebrow="Best complementary foods" title="Recommendation detail" subtitle="Review the selected supplement, match score, nutrients, and the simple absorption reason for each food." />
        {run.data?.items[0]?.matched_supplement ? (
          <AppCard style={{ gap: spacing.sm, backgroundColor: colors.cream }}>
            <Badge label="Supplement selected" tone="orange" />
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }}>{run.data.items[0].matched_supplement.name}</Text>
            <Text style={{ color: colors.muted, lineHeight: 22 }}>Foods below are ranked for nutrient synergy, preference fit, and association-rule support.</Text>
          </AppCard>
        ) : null}
        {run.data?.items[0] ? (
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <StatCard icon="sparkles" label="Match" value={`${Math.round(Number(run.data.items[0].score) * 100)}%`} />
            <StatCard icon="leaf" label="Synergy" tone="orange" value={`${Math.round(Number(run.data.items[0].nutrient_score) * 100)}%`} />
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
          <View key={item.id} style={{ gap: spacing.sm }}>
            <Badge label={`#${item.rank}`} tone="green" />
            <RecommendationCard
              category={item.food.category}
              explanation={item.explanation}
              foodName={item.food.name}
              nutrients={item.tags.length ? item.tags : item.matched_nutrients}
              score={Number(item.score)}
              supplementName={item.matched_supplement?.name}
              warnings={item.warnings}
            />
            <NutrientCard
              badge="Why this food?"
              description={`Selected for nutrient synergy, preference fit, and absorption support. ${item.matched_supplement?.name ? `${item.food.name} helps absorption of ${item.matched_supplement.name}.` : item.explanation}`}
              icon="help-circle"
              title="Selection rationale"
            />
            <QuickRecommendationActions item={item} />
            <Text style={{ color: colors.text, lineHeight: 22 }}>{item.explanation}</Text>
            {item.tags.length ? <Text style={{ color: colors.primary, fontWeight: "800" }}>Tags: {item.tags.join(", ")}</Text> : null}
            {item.warnings.length ? <Text style={{ color: colors.danger, fontWeight: "800" }}>Warnings: {item.warnings.join(", ")}</Text> : null}
            {item.warnings.length ? <Text style={{ color: colors.danger, fontWeight: "800" }}>Foods to avoid or separate: {item.warnings.join(", ")}</Text> : null}
            <FeedbackForm item={item} />
          </View>
        ))}
      </View>
    </Screen>
  );
}

function QuickRecommendationActions({ item }: { item: RecommendationItem }) {
  const [status, setStatus] = useState("");
  const feedbackMutation = useMutation({
    mutationFn: submitRecommendationFeedback,
    onError: () => {
      setStatus("Unable to save quick feedback. Try the full feedback form below.");
    },
  });
  const saveMutation = useMutation({
    mutationFn: () => saveRecommendationItem(item.id),
    onError: () => {
      setStatus("Unable to save this food right now.");
    },
    onSuccess: () => {
      setStatus("Saved to your foods.");
    },
  });

  const submitQuickFeedback = (rating: number, isHelpful: boolean, comment: string) => {
    setStatus("");
    feedbackMutation.mutate(
      {
        recommendation_item_id: item.id,
        rating,
        is_helpful: isHelpful,
        comment,
      },
      {
        onSuccess: () => {
          setStatus(isHelpful ? "Preference learned. Similar pairings will be favored." : "Preference learned. Similar pairings will be reduced.");
        },
      },
    );
  };

  return (
    <View style={{ gap: spacing.xs }}>
      <RecommendationActions
        onDislike={() => submitQuickFeedback(2, false, "Not for me from quick action.")}
        onLike={() => submitQuickFeedback(5, true, "Liked from quick action.")}
        onSave={() => saveMutation.mutate()}
      />
      {status ? <Text style={feedbackMutation.isError || saveMutation.isError ? errorStyle : successStyle}>{status}</Text> : null}
    </View>
  );
}

function FeedbackForm({ item }: { item: RecommendationItem }) {
  const [submitted, setSubmitted] = useState(false);
  const feedbackMutation = useMutation({
    mutationFn: submitRecommendationFeedback,
    onError: () => {
      setSubmitted(false);
    },
    onSuccess: () => {
      setSubmitted(true);
      form.reset({ rating: "5", comment: "" });
    },
  });
  const form = useForm<FeedbackValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { rating: "5", comment: "" },
  });

  const submitFeedback = form.handleSubmit((values) => {
    setSubmitted(false);
    feedbackMutation.mutate({
      recommendation_item_id: item.id,
      rating: Number(values.rating),
      is_helpful: Number(values.rating) >= 4,
      comment: values.comment,
    });
  });

  return (
    <AppCard style={{ gap: spacing.sm }}>
      <Text style={{ color: colors.text, fontWeight: "900" }}>Feedback</Text>
      <Controller
        control={form.control}
        name="rating"
        render={({ field: { onChange, value } }) => (
          <AppInput
            accessibilityLabel={`Rating for ${item.food.name}`}
            error={form.formState.errors.rating?.message}
            keyboardType="number-pad"
            label="Rating"
            maxLength={1}
            onChangeText={onChange}
            placeholder="Rating 1-5"
            value={value}
          />
        )}
      />
      <Controller
        control={form.control}
        name="comment"
        render={({ field: { onChange, value } }) => (
          <AppInput accessibilityLabel={`Comment for ${item.food.name}`} label="Comment" onChangeText={onChange} placeholder="Optional comment" value={value} />
        )}
      />
      {feedbackMutation.isError ? <ErrorState message="Unable to send feedback. Please try again." /> : null}
      {submitted ? <Text style={successStyle}>Feedback saved.</Text> : null}
      <AppButton accessibilityLabel={`Submit feedback for ${item.food.name}`} disabled={feedbackMutation.isPending} icon="chatbox-ellipses" label={feedbackMutation.isPending ? "Sending" : "Send feedback"} onPress={submitFeedback} />
    </AppCard>
  );
}
const successStyle = { color: colors.primary, fontWeight: "800" as const };
const errorStyle = { color: colors.danger, fontWeight: "800" as const };
