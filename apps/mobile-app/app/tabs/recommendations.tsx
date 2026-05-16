import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { AppButton, AppCard, Badge, EmptyState, ErrorState, FilterChip, LoadingState, PageHeader } from "../../src/components/ui";
import { generateRecommendations, listRecommendationHistory } from "../../src/features/recommendations/api";
import { colors, spacing } from "../../src/theme/design";

export default function RecommendationsScreen() {
  const queryClient = useQueryClient();
  const history = useQuery({ queryKey: ["recommendation-history"], queryFn: listRecommendationHistory });
  const generateMutation = useMutation({
    mutationFn: () => generateRecommendations(10),
    onSuccess: async (run) => {
      await queryClient.invalidateQueries({ queryKey: ["recommendation-history"] });
      router.replace(`/recommendations/${run.run_id}` as never);
    },
  });

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <PageHeader eyebrow="Smart Food Match" title="Today's Recommendation" subtitle="Pick food pairings for your active supplements with allergy, diet, goal, and calorie filters." />

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
          <FilterChip active icon="shield-checkmark" label="Allergies" />
          <FilterChip icon="leaf" label="Vegetarian" />
          <FilterChip icon="barbell" label="Muscle" />
          <FilterChip icon="flame" label="Calories" />
        </View>

        <AppButton
          accessibilityLabel="Generate recommendations"
          disabled={generateMutation.isPending}
          icon="sparkles"
          label={generateMutation.isPending ? "Generating" : "Generate recommendations"}
          onPress={() => generateMutation.mutate()}
        />
        {generateMutation.isError ? <ErrorState message="Unable to generate recommendations. Please try again." /> : null}

        {history.isLoading ? <LoadingState message="Loading history..." /> : null}
        {history.isError ? <ErrorState message="Unable to load recommendation history." /> : null}
        {!history.isLoading && !history.isError && history.data?.length === 0 ? (
          <EmptyState icon="restaurant" title="No recommendations generated yet." message="Generate your first supplement-aware food list." />
        ) : null}

        <View style={{ gap: spacing.md }}>
          {history.data?.map((run) => (
            <TouchableOpacity accessibilityLabel={`Open recommendation run ${run.run_id}`} key={run.run_id} onPress={() => router.push(`/recommendations/${run.run_id}` as never)}>
              <AppCard style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>{run.items.length} food recommendations</Text>
                    <Text style={{ color: colors.muted, marginTop: 3 }}>{new Date(run.created_at).toLocaleString()}</Text>
                  </View>
                  <Text style={{ color: colors.primary, fontWeight: "900" }}>View</Text>
                </View>
                {run.items[0]?.food ? (
                  <View style={{ gap: spacing.sm }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>{run.items[0].food.name}</Text>
                        <Text style={{ color: colors.muted, marginTop: 2 }}>{run.items[0].food.category}</Text>
                      </View>
                      <Badge label={`${Math.round(Number(run.items[0].score) * 100)}% match`} tone="green" />
                    </View>
                    <Text style={{ color: colors.text, lineHeight: 22 }}>
                      Helps absorption of {run.items[0].matched_supplement?.name ?? "your supplement"}: {run.items[0].explanation}
                    </Text>
                    {run.items[0].matched_supplement ? <Badge label={`With ${run.items[0].matched_supplement.name}`} tone="orange" /> : null}
                  </View>
                ) : null}
              </AppCard>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Screen>
  );
}
