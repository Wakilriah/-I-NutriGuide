import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { ImageBackground, Text, TouchableOpacity, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { AppButton, AppCard, AppTopBar, Badge, EmptyState, ErrorState, LoadingState, PageHeader } from "../../src/components/ui";
import { generateRecommendations, listRecommendationHistory } from "../../src/features/recommendations/api";
import { colors, images, radii, spacing } from "../../src/theme/design";

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
    <Screen topBar={<AppTopBar />}>
      <View style={{ gap: spacing.lg }}>
        <PageHeader eyebrow="Smart Food Match" title="Recommendations Hub" subtitle="AI-curated nutrition plans based on your recent biometric goals." />

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
              <AppCard style={{ gap: spacing.md }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>{run.items.length} food recommendations</Text>
                    <Text style={{ color: colors.muted, marginTop: 3 }}>{new Date(run.created_at).toLocaleString()}</Text>
                  </View>
                  <Text style={{ color: colors.primary, fontWeight: "900" }}>View</Text>
                </View>
                {run.items[0]?.food ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                    <ImageBackground
                      imageStyle={{ borderRadius: radii.xl }}
                      source={{ uri: images.salmonBowl }}
                      style={{
                        width: 112,
                        height: 112,
                        borderRadius: radii.xl,
                        overflow: "hidden",
                        backgroundColor: colors.surfaceContainerHigh,
                      }}
                    />
                    <View style={{ flex: 1, gap: spacing.xs }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>{run.items[0].food.name}</Text>
                        <Text style={{ color: colors.muted, marginTop: 2 }}>{run.items[0].food.category}</Text>
                      </View>
                      <Badge label={`${Math.round(Number(run.items[0].score) * 100)}% match`} tone="green" />
                      {run.items[0].matched_supplement ? <Badge label={`With ${run.items[0].matched_supplement.name}`} tone="orange" /> : null}
                    </View>
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
