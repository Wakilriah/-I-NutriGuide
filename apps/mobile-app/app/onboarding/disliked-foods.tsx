import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { AnimatedSection, AppButton, AppCard, Badge, EmptyState, FilterChip, PageHeader, ProgressSteps, SearchInput } from "../../src/components/ui";
import { searchFoods, type FoodSearchItem } from "../../src/features/foods/api";
import { getProfile, updateProfile } from "../../src/features/profile/api";
import { useAuthStore } from "../../src/stores/auth-store";
import { colors, iconSizes, radii, spacing, typography } from "../../src/theme/design";

const MAX_DISLIKED_FOODS = 12;

const fallbackFoods: FoodSearchItem[] = [
  { id: 1, name: "Broccoli", slug: "broccoli", category: "Vegetables" },
  { id: 2, name: "Mushrooms", slug: "mushrooms", category: "Vegetables" },
  { id: 3, name: "Spinach", slug: "spinach", category: "Vegetables" },
  { id: 4, name: "Sardines", slug: "sardines", category: "Fish" },
  { id: 5, name: "Tofu", slug: "tofu", category: "Protein" },
  { id: 6, name: "Eggplant", slug: "eggplant", category: "Vegetables" },
  { id: 7, name: "Beetroot", slug: "beetroot", category: "Vegetables" },
  { id: 8, name: "Oats", slug: "oats", category: "Grains" },
  { id: 9, name: "Lentils", slug: "lentils", category: "Legumes" },
  { id: 10, name: "Greek yogurt", slug: "greek-yogurt", category: "Dairy" },
  { id: 11, name: "Peanut butter", slug: "peanut-butter", category: "Nuts" },
  { id: 12, name: "Avocado", slug: "avocado", category: "Fruit" },
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export default function DislikedFoodsOnboardingScreen() {
  const [query, setQuery] = useState("");
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const profile = await getProfile();
        if (mounted) {
          setSelectedFoods(profile.disliked_foods.slice(0, MAX_DISLIKED_FOODS));
        }
      } catch {
        // Empty defaults are fine for first-time onboarding.
      }
    }

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const trimmedQuery = query.trim();
  const foodSearch = useQuery({
    enabled: trimmedQuery.length >= 2,
    queryKey: ["foods", "search", trimmedQuery],
    queryFn: () => searchFoods(trimmedQuery),
  });

  const fallbackMatches = useMemo(() => {
    if (!trimmedQuery) {
      return fallbackFoods;
    }
    const needle = normalize(trimmedQuery);
    return fallbackFoods.filter((food) => normalize(food.name).includes(needle) || normalize(food.category ?? "").includes(needle));
  }, [trimmedQuery]);

  const foods = trimmedQuery.length >= 2 && foodSearch.data?.length ? foodSearch.data : fallbackMatches;

  const toggleFood = (name: string) => {
    setStatus(null);
    setSelectedFoods((current) => {
      if (current.includes(name)) {
        return current.filter((food) => food !== name);
      }
      if (current.length >= MAX_DISLIKED_FOODS) {
        setStatus(`You can choose up to ${MAX_DISLIKED_FOODS} disliked foods.`);
        return current;
      }
      return [...current, name];
    });
  };

  const onFinish = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await updateProfile({ disliked_foods: selectedFoods });
      useAuthStore.getState().setProfileComplete(true);
      router.replace("/tabs/home");
    } catch {
      setStatus("Unable to save disliked foods right now.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <ProgressSteps current={4} total={4} />
        <AnimatedSection>
          <PageHeader eyebrow="Step 4 of 4" title="Foods you prefer to avoid" subtitle="Search foods and select the ones you do not want in recommendations." />
        </AnimatedSection>

        <AnimatedSection delay={80}>
          <AppCard style={{ gap: spacing.md }}>
            <SearchInput onChangeText={setQuery} placeholder="Search foods to avoid" value={query} />

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
              <Text style={typography.label}>Selected</Text>
              <Badge label={`${selectedFoods.length}/${MAX_DISLIKED_FOODS}`} tone={selectedFoods.length >= MAX_DISLIKED_FOODS ? "red" : "neutral"} />
            </View>

            {selectedFoods.length ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                {selectedFoods.map((food) => (
                  <FilterChip active icon="close-circle" key={food} label={food} onPress={() => toggleFood(food)} />
                ))}
              </View>
            ) : (
              <Text style={typography.body}>No disliked foods selected yet. You can also skip this step.</Text>
            )}

            {status ? <Text style={{ color: status.startsWith("Unable") ? colors.danger : colors.warning, fontWeight: "800" }}>{status}</Text> : null}
          </AppCard>
        </AnimatedSection>

        <AnimatedSection delay={140} style={{ gap: spacing.sm }}>
          <Text style={typography.section}>{trimmedQuery ? "Search results" : "Common foods"}</Text>
          {foodSearch.isLoading ? <Text style={typography.body}>Searching foods...</Text> : null}
          {!foods.length && !foodSearch.isLoading ? <EmptyState icon="search" title="No foods found" message="Try a simpler food name or choose from the common list." /> : null}
          {foods.slice(0, 12).map((food) => {
            const selected = selectedFoods.includes(food.name);
            return (
              <TouchableOpacity
                accessibilityLabel={`${selected ? "Remove" : "Select"} ${food.name}`}
                key={`${food.slug}-${food.id}`}
                onPress={() => toggleFood(food.name)}
                style={{
                  minHeight: 58,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.sm,
                  borderColor: selected ? colors.primary : colors.border,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  backgroundColor: selected ? colors.primarySoft : colors.surface,
                  paddingHorizontal: spacing.md,
                }}
              >
                <View style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.cream }}>
                  <Ionicons color={selected ? colors.primary : colors.secondary} name={selected ? "checkmark-circle" : "restaurant"} size={iconSizes.md} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>{food.name}</Text>
                  {food.category ? <Text style={{ color: colors.muted, marginTop: 2 }}>{food.category}</Text> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </AnimatedSection>

        <AnimatedSection delay={200} style={{ gap: spacing.sm }}>
          <AppButton accessibilityLabel="Finish onboarding" disabled={saving} icon="checkmark-circle" label={saving ? "Saving" : "Finish setup"} onPress={onFinish} />
          <AppButton disabled={saving} icon="arrow-forward" label="Skip for now" onPress={onFinish} variant="ghost" />
        </AnimatedSection>
      </View>
    </Screen>
  );
}
