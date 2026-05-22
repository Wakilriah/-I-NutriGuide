import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { ImageBackground, Text, TouchableOpacity, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import {
  AnimatedSection,
  AppButton,
  AppCard,
  AppTopBar,
  Badge,
  EmptyState,
  ErrorState,
  FoodCard,
  NutrientCard,
  SearchInput,
  SectionHeader,
  SkeletonCard,
  StatCard,
  SupplementCard,
} from "../../src/components/ui";
import { generateRecommendations, listRecommendationHistory } from "../../src/features/recommendations/api";
import { listUserSupplements } from "../../src/features/supplements/api";
import { useAuthStore } from "../../src/stores/auth-store";
import { cards, colors, images, radii, spacing } from "../../src/theme/design";

type IconName = ComponentProps<typeof Ionicons>["name"];

type QuickActionProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: "green" | "orange" | "neutral";
};

function QuickAction({ icon, label, onPress, tone = "green" }: QuickActionProps) {
  const palette = {
    green: { backgroundColor: colors.primarySoft, color: colors.primary },
    orange: { backgroundColor: colors.secondarySoft, color: colors.secondary },
    neutral: { backgroundColor: colors.surfaceSoft, color: colors.muted },
  }[tone];

  return (
    <TouchableOpacity
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        ...cards.default,
        flex: 1,
        minWidth: 102,
        minHeight: 104,
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
      }}
    >
      <View style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: palette.backgroundColor }}>
        <Ionicons color={palette.color} name={icon} size={21} />
      </View>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: "900", lineHeight: 18, textAlign: "center" }}>{label}</Text>
    </TouchableOpacity>
  );
}

function HeroMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 96,
        borderColor: "rgba(255,255,255,0.24)",
        borderRadius: radii.md,
        borderWidth: 1,
        backgroundColor: "rgba(255,255,255,0.58)",
        padding: spacing.sm,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: "900" }}>{value}</Text>
      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900", marginTop: 2, textTransform: "uppercase" }}>{label}</Text>
    </View>
  );
}

function MiniPlanCard({ icon, label, title }: { icon: IconName; label: string; title: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radii.lg, backgroundColor: colors.surfaceSoft, padding: spacing.sm }}>
      <View style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.primarySoft }}>
        <Ionicons color={colors.primary} name={icon} size={19} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "900", textTransform: "uppercase" }}>{label}</Text>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "900", marginTop: 2 }}>{title}</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const supplements = useQuery({ queryKey: ["user-supplements"], queryFn: listUserSupplements });
  const history = useQuery({ queryKey: ["recommendation-history"], queryFn: listRecommendationHistory });
  const latestRun = history.data?.[0];
  const latestItem = latestRun?.items[0];
  const activeSupplementCount = supplements.data?.filter((item) => item.active).length ?? 0;
  const generateMutation = useMutation({
    mutationFn: () => generateRecommendations(10),
    onSuccess: async (run) => {
      await queryClient.invalidateQueries({ queryKey: ["recommendation-history"] });
      router.replace(`/recommendations/${run.run_id}` as never);
    },
  });

  const openLatestOrGenerate = () => {
    if (latestRun) {
      router.push(`/recommendations/${latestRun.run_id}` as never);
      return;
    }
    generateMutation.mutate();
  };

  return (
    <Screen topBar={<AppTopBar onAvatarPress={() => router.push("/tabs/profile" as never)} />}>
      <View style={{ gap: spacing.lg }}>
        <AnimatedSection>
          <ImageBackground
            imageStyle={{ borderRadius: radii.xl }}
            source={{ uri: images.breakfast }}
            style={{ minHeight: 280, justifyContent: "flex-end", overflow: "hidden", borderRadius: radii.xl }}
          >
            <View style={{ flex: 1, justifyContent: "flex-end", padding: spacing.md, backgroundColor: colors.overlaySoft }}>
              <View
                style={{
                  gap: spacing.md,
                  borderColor: "rgba(255,255,255,0.58)",
                  borderRadius: radii.xl,
                  borderWidth: 1,
                  backgroundColor: "rgba(255,255,255,0.84)",
                  padding: spacing.lg,
                }}
              >
                <View style={{ gap: spacing.xs }}>
                  <Text style={{ color: colors.primary, fontSize: 15, fontWeight: "900" }}>Hi {user?.name ?? "there"}</Text>
                  <Text style={{ color: colors.text, fontSize: 22, fontWeight: "900" }}>Good Morning, {user?.name ?? "there"}!</Text>
                  <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 23 }}>Ready for your Vitamin C boost?</Text>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  <HeroMetric label="Active supplements" value={activeSupplementCount} />
                  <HeroMetric label="Food matches" value={history.data?.length ?? 0} />
                </View>
              </View>
            </View>
          </ImageBackground>
        </AnimatedSection>

        <AnimatedSection delay={40}>
          <AppButton
            accessibilityLabel={latestRun ? "Open latest recommendation" : "Generate today's match"}
            disabled={generateMutation.isPending}
            icon="sparkles"
            label={generateMutation.isPending ? "Generating" : latestRun ? "Open today's match" : "Generate today's match"}
            onPress={openLatestOrGenerate}
          />
        </AnimatedSection>

        <AnimatedSection delay={70}>
          <SearchInput placeholder="Search foods, supplements, nutrients" />
        </AnimatedSection>

        {generateMutation.isError ? (
          <AnimatedSection delay={90}>
            <ErrorState message="Unable to generate recommendations. Please try again." />
          </AnimatedSection>
        ) : null}

        <AnimatedSection delay={120} style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <QuickAction icon="add-circle" label="Add supplement" onPress={() => router.push("/supplements/new" as never)} />
          <QuickAction icon="restaurant" label="Food matches" onPress={() => router.push("/tabs/recommendations" as never)} tone="orange" />
          <QuickAction icon="analytics" label="Track today" onPress={() => router.push("/tabs/tracking" as never)} tone="neutral" />
        </AnimatedSection>

        <AnimatedSection delay={160} style={{ flexDirection: "row", gap: spacing.sm }}>
          <StatCard icon="nutrition" label="Supplements" value={activeSupplementCount} />
          <StatCard icon="sparkles" label="Matches" tone="orange" value={history.data?.length ?? 0} />
        </AnimatedSection>

        <AnimatedSection delay={200} style={{ gap: spacing.sm }}>
          <SectionHeader title="Today's routine" />
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

        <AnimatedSection delay={240} style={{ gap: spacing.sm }}>
          <SectionHeader title={latestItem ? "Best match now" : "Daily plan preview"} />
          {history.isLoading ? <SkeletonCard lines={2} /> : null}
          {latestItem ? (
            <FoodCard
              category={latestItem.food.category}
              name={latestItem.food.name}
              nutrients={latestItem.tags.length ? latestItem.tags : latestItem.matched_nutrients}
              reason={`Pairs with ${latestItem.matched_supplement?.name ?? "your supplement"} for a stronger nutrient routine.`}
              score={Number(latestItem.score)}
            />
          ) : null}
          {!history.isLoading && !latestItem ? (
            <AppCard style={{ gap: spacing.sm }}>
              <MiniPlanCard icon="sunny" label="Breakfast" title="Citrus yogurt bowl" />
              <MiniPlanCard icon="leaf" label="Lunch" title="Leafy green protein bowl" />
              <MiniPlanCard icon="restaurant" label="Dinner" title="Tomato chickpea plate" />
            </AppCard>
          ) : null}
        </AnimatedSection>

        <AnimatedSection delay={280}>
          <NutrientCard
            badge="Absorption Tip"
            description="Vitamin C can support iron absorption, while calcium may reduce iron absorption when taken too close together."
            icon="bulb"
            title="Why Timing Matters"
          />
        </AnimatedSection>

        <AnimatedSection delay={320} style={{ gap: spacing.sm }}>
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
