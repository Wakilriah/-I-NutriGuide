import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { AnimatedSection, AppButton, AppCard, EmptyState, FadeInSection, FilterChip, FoodCard, NutrientCard, SearchInput, SectionHeader, SkeletonCard, StatCard, SupplementCard } from "../../src/components/ui";
import { generateRecommendations, listRecommendationHistory } from "../../src/features/recommendations/api";
import { listUserSupplements } from "../../src/features/supplements/api";
import { useAuthStore } from "../../src/stores/auth-store";
import { colors, spacing } from "../../src/theme/design";

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const supplements = useQuery({ queryKey: ["user-supplements"], queryFn: listUserSupplements });
  const history = useQuery({ queryKey: ["recommendation-history"], queryFn: listRecommendationHistory });
  const latestRun = history.data?.[0];
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
        <AnimatedSection>
          <AppCard style={{ gap: spacing.md, backgroundColor: colors.primary, overflow: "hidden" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={{ color: colors.surface, fontSize: 29, fontWeight: "900" }}>Hi {user?.name ?? "there"}</Text>
                <Text style={{ color: colors.surfaceOnDark, fontSize: 15, lineHeight: 23 }}>
                  Today's Recommendation is ready to pair supplements with colorful foods, clean nutrients, and your goals.
                </Text>
              </View>
              <View style={{ width: 58, height: 58, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.surfaceOnDark }}>
                <Text style={{ color: colors.primary, fontSize: 26, fontWeight: "900" }}>IG</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
              <FilterChip active icon="sparkles" label="Smart match" />
              <FilterChip active icon="shield-checkmark" label="Preference aware" />
            </View>
          </AppCard>
        </AnimatedSection>

        <AnimatedSection delay={70}>
          <SearchInput />
        </AnimatedSection>

        <AnimatedSection delay={120} style={{ flexDirection: "row", gap: spacing.sm }}>
          <StatCard icon="nutrition" label="Supplements" value={supplements.data?.filter((item) => item.active).length ?? 0} />
          <StatCard icon="sparkles" label="Matches" tone="orange" value={history.data?.length ?? 0} />
        </AnimatedSection>

        <AnimatedSection delay={170} style={{ gap: spacing.sm }}>
          <SectionHeader title="Daily supplement" />
          {supplements.isLoading ? <SkeletonCard lines={1} /> : null}
          {supplements.data?.slice(0, 2).map((item) => (
            <SupplementCard
              active={item.active}
              dose={item.dose}
              frequency={item.frequency}
              key={item.id}
              name={item.supplement.name}
              timeOfDay={item.time_of_day}
            />
          ))}
          {!supplements.isLoading && supplements.data?.length === 0 ? (
            <EmptyState icon="medical" title="No supplements yet" message="Add your first supplement to unlock personalized food recommendations." />
          ) : null}
        </AnimatedSection>

        <AnimatedSection delay={220} style={{ gap: spacing.sm }}>
          <SectionHeader title="Recommended food cards" />
          {history.isLoading ? <SkeletonCard lines={2} /> : null}
          {latestRun?.items.slice(0, 2).map((item) => (
            <FoodCard
              category={item.food.category}
              key={item.id}
              name={item.food.name}
              nutrients={item.tags.length ? item.tags : item.matched_nutrients}
              reason={`Helps absorption of ${item.matched_supplement?.name ?? "your supplement"}.`}
              score={Number(item.score)}
            />
          ))}
          {!history.isLoading && !latestRun ? (
            <EmptyState icon="restaurant" title="Generate your first match" message="I-NutriGuide will suggest foods that complement your supplements." />
          ) : null}
        </AnimatedSection>

        <FadeInSection delay={260} style={{ gap: spacing.sm }}>
          <SectionHeader title="Smart Daily Plan" />
          <AppCard style={{ gap: spacing.sm }}>
            <FoodCard
              category="Breakfast"
              name="Citrus yogurt bowl"
              nutrients={["vitamin C", "protein", "calcium"]}
              reason="Breakfast pairing for morning supplements. Vitamin C can support iron-focused routines."
              score={0.88}
            />
            <FoodCard
              category="Lunch"
              name="Leafy green protein bowl"
              nutrients={["iron", "folate", "magnesium"]}
              reason="Lunch pairing with greens and protein for steady energy and micronutrient density."
              score={0.91}
            />
            <FoodCard
              category="Dinner"
              name="Tomato chickpea plate"
              nutrients={["fiber", "lycopene", "plant protein"]}
              reason="Dinner pairing with warm proteins and tomato-rich vegetables for a balanced day."
              score={0.84}
            />
          </AppCard>
        </FadeInSection>

        <AnimatedSection delay={300}>
          <NutrientCard
            description="Smart Food Match combines content-based filtering with association rules so leafy greens, fruits, proteins, and whole foods are ranked by supplement fit."
            icon="flask"
            title="Nutrient Synergy"
          />
        </AnimatedSection>
        <AnimatedSection delay={340}>
          <NutrientCard
            badge="Absorption Tip"
            description="Vitamin C improves iron absorption, while calcium may reduce iron absorption when taken too close together."
            icon="bulb"
            title="Why Timing Matters"
          />
        </AnimatedSection>

        <AnimatedSection delay={380} style={{ gap: spacing.sm }}>
          <AppButton icon="medical" label="Add supplement" onPress={() => router.push("/supplements/new" as never)} variant="secondary" />
          <AppButton
            accessibilityLabel="Generate recommendations"
            disabled={generateMutation.isPending}
            icon="sparkles"
            label={generateMutation.isPending ? "Generating" : "Generate recommendations"}
            onPress={() => generateMutation.mutate()}
          />
          <AppButton icon="time" label="View history" onPress={() => router.push("/tabs/recommendations" as never)} variant="ghost" />
        </AnimatedSection>
      </View>
    </Screen>
  );
}
