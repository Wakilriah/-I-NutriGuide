import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { AppButton, AppCard, AppTopBar, Badge, EmptyState, ErrorState, FoodCard, LoadingState, PageHeader, SectionHeader } from "../../src/components/ui";
import { listSavedRecommendationItems, removeSavedRecommendationItem } from "../../src/features/recommendations/api";
import { colors, spacing } from "../../src/theme/design";

export default function SavedFoodsScreen() {
  const queryClient = useQueryClient();
  const savedFoods = useQuery({ queryKey: ["saved-recommendation-items"], queryFn: listSavedRecommendationItems });
  const removeMutation = useMutation({
    mutationFn: removeSavedRecommendationItem,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["saved-recommendation-items"] });
    },
  });

  return (
    <Screen topBar={<AppTopBar />}>
      <View style={{ gap: spacing.lg }}>
        <PageHeader eyebrow="Saved pairings" title="Saved Foods" subtitle="Keep your best supplement-aware food matches for meal planning and quick reference." />

        {savedFoods.isLoading ? <LoadingState message="Loading saved foods..." /> : null}
        {savedFoods.isError ? <ErrorState message="Unable to load saved foods." /> : null}
        {removeMutation.isError ? <ErrorState message="Unable to remove this saved food. Please try again." /> : null}
        {!savedFoods.isLoading && !savedFoods.isError && savedFoods.data?.length === 0 ? (
          <EmptyState icon="bookmark" title="No saved foods yet" message="Open a recommendation and tap Save to build your wellness list." />
        ) : null}

        {savedFoods.data?.length ? <SectionHeader title={`${savedFoods.data.length} saved matches`} /> : null}

        <View style={{ gap: spacing.md }}>
          {savedFoods.data?.map((savedItem) => {
            const item = savedItem.recommendation_item;
            return (
              <AppCard key={savedItem.id} style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Badge label="Saved" tone="orange" />
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900", marginTop: spacing.xs }}>{item.food.name}</Text>
                    <Text style={{ color: colors.muted, marginTop: 3 }}>{new Date(savedItem.created_at).toLocaleString()}</Text>
                  </View>
                  <Badge label={`${Math.round(Number(item.score) * 100)}% match`} tone="green" />
                </View>

                <FoodCard
                  category={item.food.category}
                  name={item.food.name}
                  nutrients={item.tags.length ? item.tags : item.matched_nutrients}
                  reason={`Helps absorption of ${item.matched_supplement?.name ?? "your supplement"}. ${item.explanation}`}
                  score={Number(item.score)}
                />

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <AppButton
                      accessibilityLabel={`Open saved recommendation ${item.id}`}
                      icon="open"
                      label="Open"
                      onPress={() => router.push(`/recommendations/${item.run_id}` as never)}
                      variant="secondary"
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <AppButton
                      accessibilityLabel={`Remove saved food ${item.food.name}`}
                      disabled={removeMutation.isPending}
                      icon="trash"
                      label={removeMutation.isPending ? "Removing" : "Remove"}
                      onPress={() => removeMutation.mutate(savedItem.id)}
                      variant="ghost"
                    />
                  </View>
                </View>
              </AppCard>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}
