import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { AppButton, AppCard, Badge, OnboardingShell, SearchInput } from "../../src/components/ui";
import { searchFoods, type FoodSearchItem } from "../../src/features/foods/api";
import { getProfile, updateProfile } from "../../src/features/profile/api";
import { useAuthStore } from "../../src/stores/auth-store";
import { colors, radii, spacing, typography } from "../../src/theme/design";

const MAX_DISLIKED_FOODS = 12;

const fallbackFoods: FoodSearchItem[] = [
  { id: 1, name: "Broccoli", slug: "broccoli", category: "Vegetables", serving_size_g: "100", nutrients: [] },
  { id: 2, name: "Mushrooms", slug: "mushrooms", category: "Vegetables", serving_size_g: "100", nutrients: [] },
  { id: 3, name: "Spinach", slug: "spinach", category: "Vegetables", serving_size_g: "100", nutrients: [] },
  { id: 4, name: "Sardines", slug: "sardines", category: "Fish", serving_size_g: "100", nutrients: [] },
  { id: 5, name: "Tofu", slug: "tofu", category: "Protein", serving_size_g: "100", nutrients: [] },
  { id: 6, name: "Eggplant", slug: "eggplant", category: "Vegetables", serving_size_g: "100", nutrients: [] },
  { id: 7, name: "Lentils", slug: "lentils", category: "Legumes", serving_size_g: "100", nutrients: [] },
  { id: 8, name: "Greek yogurt", slug: "greek-yogurt", category: "Dairy", serving_size_g: "100", nutrients: [] },
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
        setStatus(`Limit reached (${MAX_DISLIKED_FOODS}).`);
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
      setStatus("Unable to save your choices.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentStyle={{ paddingBottom: 48 }} showAiAssistant={false}>
      <OnboardingShell current={4} subtitle="Choose foods you dislike so your meal ideas feel realistic from day one." title="Anything you prefer to avoid?">
        <AppCard style={{ gap: spacing.md, backgroundColor: colors.cream }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
            <Text style={typography.section}>My dislikes</Text>
            <Badge label={`${selectedFoods.length}/${MAX_DISLIKED_FOODS}`} tone={selectedFoods.length >= MAX_DISLIKED_FOODS ? "red" : "green"} />
          </View>
          <SearchInput onChangeText={setQuery} placeholder="Search foods to avoid" value={query} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            {selectedFoods.length ? selectedFoods.map((food) => (
              <TouchableOpacity key={food} onPress={() => toggleFood(food)} style={styles.selectedChip}>
                <Text style={styles.selectedChipText}>{food}</Text>
                <Ionicons color={colors.primary} name="close" size={14} />
              </TouchableOpacity>
            )) : <Text style={typography.body}>No foods selected yet.</Text>}
          </View>
        </AppCard>

        <View style={{ gap: spacing.sm }}>
          {foods.slice(0, 7).map((food) => {
            const selected = selectedFoods.includes(food.name);
            return (
              <TouchableOpacity key={food.id} onPress={() => toggleFood(food.name)} style={[styles.foodRow, selected && styles.foodRowSelected]}>
                <View style={styles.foodIcon}>
                  <Ionicons color={selected ? colors.surface : colors.primary} name={selected ? "checkmark" : "add"} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.foodName, selected && { color: colors.surface }]}>{food.name}</Text>
                  <Text style={[styles.foodMeta, selected && { color: colors.surfaceOnDark }]}>{food.category || "Food"}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {status ? <Text style={styles.status}>{status}</Text> : null}
        <AppButton accessibilityLabel="Get Started" disabled={saving} icon="arrow-forward" label={saving ? "Finalizing..." : "Get Started"} onPress={onFinish} />
        <TouchableOpacity onPress={() => router.replace("/tabs/home" as never)} style={{ alignItems: "center", paddingVertical: spacing.sm }}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "900" }}>SKIP FOR NOW</Text>
        </TouchableOpacity>
      </OnboardingShell>
    </Screen>
  );
}

const styles = {
  selectedChip: {
    minHeight: 34,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
  },
  selectedChipText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900" as const,
  },
  foodRow: {
    minHeight: 74,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  foodRowSelected: {
    backgroundColor: colors.primary,
  },
  foodIcon: {
    width: 42,
    height: 42,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  foodName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900" as const,
  },
  foodMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700" as const,
    marginTop: 2,
  },
  status: {
    color: colors.danger,
    fontWeight: "900" as const,
    textAlign: "center" as const,
  },
};
