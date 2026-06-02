"use client";

import { Ionicons } from "@expo/vector-icons";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { ActivityIndicator, FlatList, ScrollView, Text, TextInput, TouchableOpacity, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { MobileAppShell } from "../../src/components/MobileAppShell";
import { AddWaterCard, AppButton, AppTopBar, Badge, ErrorState, FoodSearchLogCard, LoggedFoodList } from "../../src/components/ui";
import { searchFoodsPage, type FoodSearchItem } from "../../src/features/foods/api";
import { listUserSupplements } from "../../src/features/supplements/api";
import { getTodayTracking, updateTodayTracking, type FoodEntry } from "../../src/features/tracking/api";
import { useDebouncedValue } from "../../src/hooks/useDebouncedValue";
import { cards, colors, radii, spacing, typography } from "../../src/theme/design";

function toNumber(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function nutrientAmount(food: FoodSearchItem, slug: string) {
  return toNumber(food.nutrients.find((nutrient) => nutrient.slug === slug)?.amount);
}

function nutrientAmountAny(food: FoodSearchItem, slugs: string[]) {
  return slugs.reduce((amount, slug) => amount || nutrientAmount(food, slug), 0);
}

function scaledNutrients(food: FoodSearchItem, serving_g: number) {
  const factor = serving_g / 100;
  return {
    calories: Math.round(factor * nutrientAmountAny(food, ["calories", "energy"])),
    protein: Math.round(factor * nutrientAmountAny(food, ["protein", "protein_g"]) * 10) / 10,
    carbs: Math.round(factor * nutrientAmountAny(food, ["carbs", "carbohydrates", "carbohydrate"]) * 10) / 10,
    fat: Math.round(factor * nutrientAmountAny(food, ["fat", "fats", "total_fat"]) * 10) / 10,
  };
}

export default function LogFoodScreen() {
  const params = useLocalSearchParams<{ search?: string }>();
  const queryClient = useQueryClient();
  const today = useQuery({ queryKey: ["tracking", "today"], queryFn: getTodayTracking });
  const supplements = useQuery({ queryKey: ["user-supplements"], queryFn: listUserSupplements });
  const [foodQuery, setFoodQuery] = useState("");
  const [gramsByFood, setGramsByFood] = useState<Record<number, string>>({});
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [waterMl, setWaterMl] = useState("0");
  const [taken, setTaken] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [manualFoodName, setManualFoodName] = useState("");
  const [manualMealType, setManualMealType] = useState("Breakfast");
  const [manualQuantity, setManualQuantity] = useState("100");
  const [manualUnit, setManualUnit] = useState("g");
  const [manualCalories, setManualCalories] = useState("0");
  const [manualProtein, setManualProtein] = useState("0");
  const [manualCarbs, setManualCarbs] = useState("0");
  const [manualFat, setManualFat] = useState("0");
  const [manualTime, setManualTime] = useState("08:30");
  const [manualNotes, setManualNotes] = useState("");
  const debouncedFoodQuery = useDebouncedValue(foodQuery.trim(), 350);

  useEffect(() => {
    if (today.data) {
      setFoodEntries(today.data.food_entries ?? []);
      setWaterMl(String(today.data.water_ml ?? 0));
      setTaken(today.data.supplements_taken ?? []);
    }
  }, [today.data]);

  useEffect(() => {
    if (typeof params.search === "string" && params.search.trim()) {
      setFoodQuery(params.search);
    }
  }, [params.search]);

  const search = useInfiniteQuery({
    enabled: debouncedFoodQuery.length >= 2,
    initialPageParam: 1,
    queryKey: ["foods", "infinite", debouncedFoodQuery],
    queryFn: ({ pageParam }) => searchFoodsPage({ page: pageParam, search: debouncedFoodQuery }),
    getNextPageParam: (lastPage, allPages) => (lastPage.next ? allPages.length + 1 : undefined),
  });

  const foods = search.data?.pages.flatMap((page) => page.results) ?? [];
  const showSearchResults = debouncedFoodQuery.length >= 2;
  const totals = useMemo(
    () =>
      foodEntries.reduce(
        (acc, entry) => ({
          calories: acc.calories + toNumber(entry.calories),
          protein_g: acc.protein_g + toNumber(entry.protein_g),
        }),
        { calories: 0, protein_g: 0 },
      ),
    [foodEntries],
  );

  const saveMutation = useMutation({
    mutationFn: ({ nextEntries, nextTaken, nextWaterMl }: { nextEntries?: FoodEntry[]; nextTaken?: string[]; nextWaterMl?: string }) => {
      const entries = nextEntries ?? foodEntries;
      const calories = entries.reduce((sum, entry) => sum + toNumber(entry.calories), 0);
      const protein = entries.reduce((sum, entry) => sum + toNumber(entry.protein_g), 0);
      return updateTodayTracking({
        calories: Math.round(calories),
        protein_g: protein.toFixed(1),
        water_ml: Math.min(toNumber(nextWaterMl ?? waterMl), 10000),
        food_entries: entries,
        supplements_taken: nextTaken ?? taken,
      });
    },
    onError: () => setStatus("Unable to save this update."),
    onSuccess: async () => {
      setStatus("Daily log updated.");
      await queryClient.invalidateQueries({ queryKey: ["tracking"] });
    },
  });

  const addFood = (food: FoodSearchItem) => {
    const serving_g = Math.max(1, Math.min(5000, toNumber(gramsByFood[food.id]) || toNumber(food.serving_size_g) || 100));
    const nutrients = scaledNutrients(food, serving_g);
    const nextEntry: FoodEntry = {
      food_id: food.id,
      food_name: food.name,
      serving_g,
      calories: nutrients.calories,
      protein_g: nutrients.protein,
      carbs_g: nutrients.carbs,
      fat_g: nutrients.fat,
      meal_type: "Search",
      unit: "g",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      notes: "",
      timestamp: new Date().toISOString(),
    };
    const nextEntries = [...foodEntries, nextEntry];
    setFoodEntries(nextEntries);
    saveMutation.mutate({ nextEntries });
  };

  const addManualFood = () => {
    const name = manualFoodName.trim();
    if (!name) {
      setStatus("Enter a food name before saving.");
      return;
    }
    const nextEntry: FoodEntry = {
      food_id: 0,
      food_name: name,
      serving_g: Math.max(1, toNumber(manualQuantity)),
      calories: Math.max(0, Math.round(toNumber(manualCalories))),
      protein_g: Math.max(0, Math.round(toNumber(manualProtein) * 10) / 10),
      carbs_g: Math.max(0, Math.round(toNumber(manualCarbs) * 10) / 10),
      fat_g: Math.max(0, Math.round(toNumber(manualFat) * 10) / 10),
      meal_type: manualMealType,
      unit: manualUnit.trim() || "g",
      time: manualTime.trim(),
      notes: manualNotes.trim(),
      timestamp: new Date().toISOString(),
    };
    const nextEntries = [...foodEntries, nextEntry];
    setFoodEntries(nextEntries);
    setManualFoodName("");
    setManualCalories("0");
    setManualProtein("0");
    setManualCarbs("0");
    setManualFat("0");
    setManualTime("08:30");
    setManualNotes("");
    saveMutation.mutate({ nextEntries });
  };

  const removeFood = (index: number) => {
    const nextEntries = foodEntries.filter((_, itemIndex) => itemIndex !== index);
    setFoodEntries(nextEntries);
    saveMutation.mutate({ nextEntries });
  };

  const toggleSupplement = (name: string) => {
    const nextTaken = taken.includes(name) ? taken.filter((item) => item !== name) : [...taken, name];
    setTaken(nextTaken);
    saveMutation.mutate({ nextTaken });
  };

  const saveWater = (value: string | number = waterMl) => {
    const normalized = String(Math.max(0, Math.min(10000, Math.round(toNumber(value)))));
    setWaterMl(normalized);
    saveMutation.mutate({ nextWaterMl: normalized });
  };

  const fetchMoreFoods = () => {
    if (showSearchResults && search.hasNextPage && !search.isFetchingNextPage) {
      search.fetchNextPage();
    }
  };

  const handleResultsScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    if (distanceFromBottom < 72) {
      fetchMoreFoods();
    }
  };

  const renderFoodResult = (item: FoodSearchItem) => {
    const serving = Math.max(1, toNumber(gramsByFood[item.id]) || toNumber(item.serving_size_g) || 100);
    const nutrients = scaledNutrients(item, serving);
    return (
      <View key={item.id} style={styles.foodResult}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text numberOfLines={1} style={styles.rowTitle}>{item.name}</Text>
          <Text numberOfLines={1} style={styles.rowMeta}>{item.category || "Food"} - {Math.round(serving)}g serving</Text>
          <View style={styles.macroChips}>
            <MacroPill label="Cal" value={`${nutrients.calories}`} />
            <MacroPill label="Pro" value={`${nutrients.protein}g`} />
            <MacroPill label="Carb" value={`${nutrients.carbs}g`} />
            <MacroPill label="Fat" value={`${nutrients.fat}g`} />
          </View>
          <View style={styles.gramsRow}>
            <TextInput
              keyboardType="numeric"
              onChangeText={(nextValue) => setGramsByFood((current) => ({ ...current, [item.id]: nextValue }))}
              placeholder={String(Math.round(toNumber(item.serving_size_g) || 100))}
              placeholderTextColor={colors.placeholder}
              style={styles.gramsInput}
              value={gramsByFood[item.id] ?? ""}
            />
            <Text style={styles.rowMeta}>grams</Text>
          </View>
        </View>
        <TouchableOpacity accessibilityLabel={`Add ${item.name}`} onPress={() => addFood(item)} style={styles.addButton}>
          <Ionicons color={colors.surface} name="add" size={20} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <MobileAppShell>
      <AppTopBar title="Add food" subtitle="Log meal" />
      <FlatList
        data={[] as FoodSearchItem[]}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: spacing.xl, padding: spacing.md }}>
            <AddWaterCard onAdd={() => saveWater(toNumber(waterMl) + 250)} onRemove={() => saveWater(toNumber(waterMl) - 250)} valueMl={toNumber(waterMl)} />

            <FoodSearchLogCard onSearchChange={setFoodQuery} searchValue={foodQuery}>
              <Text style={typography.body}>Search foods, choose quantity, and keep today's nutrition totals accurate.</Text>
            </FoodSearchLogCard>

            {showSearchResults ? (
              <View style={styles.resultsPanel}>
                <View style={styles.resultsHeader}>
                  <Text style={typography.section}>Search results</Text>
                  <View style={styles.resultsHeaderActions}>
                    <Text style={styles.resultsCount}>{foods.length.toLocaleString()} loaded</Text>
                    <TouchableOpacity accessibilityLabel="Clear food search" onPress={() => setFoodQuery("")} style={styles.clearResultsButton}>
                      <Ionicons color={colors.muted} name="close" size={17} />
                    </TouchableOpacity>
                  </View>
                </View>
                {foods.length ? (
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                    onMomentumScrollEnd={handleResultsScroll}
                    onScroll={handleResultsScroll}
                    scrollEventThrottle={120}
                    showsVerticalScrollIndicator
                    style={styles.resultsScroller}
                  >
                    {foods.map(renderFoodResult)}
                    {search.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.md }} /> : null}
                    {!search.hasNextPage && foods.length ? <Text style={styles.endText}>End of results</Text> : null}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyResults}>
                    {search.isLoading ? <ActivityIndicator color={colors.primary} /> : <Text style={typography.body}>No foods found.</Text>}
                  </View>
                )}
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={
          <View style={{ gap: spacing.xl, padding: spacing.md, paddingBottom: 156 }}>
            <LoggedFoodList entries={foodEntries} onEdit={(index) => setStatus(`Edit ${foodEntries[index]?.food_name ?? "food"} from today's log.`)} onRemove={removeFood} title="Logged food list" />

            <View style={styles.summary}>
              <View>
                <Text style={styles.summaryLabel}>Today</Text>
                <Text style={styles.summaryValue}>{Math.round(totals.calories).toLocaleString()} kcal</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View>
                <Text style={styles.summaryLabel}>Protein</Text>
                <Text style={styles.summaryValue}>{Math.round(totals.protein_g * 10) / 10}g</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View>
                <Text style={styles.summaryLabel}>Water</Text>
                <Text style={styles.summaryValue}>{toNumber(waterMl).toLocaleString()} ml</Text>
              </View>
              <Badge label={`${foodEntries.length} foods`} tone="neutral" />
            </View>

            <View style={styles.manualCard}>
              <Text style={typography.section}>Manual food log</Text>
              <Field label="Food Name" onChangeText={setManualFoodName} placeholder="e.g. Avocado Toast" value={manualFoodName} />
              <View style={styles.mealTabs}>
                {["Breakfast", "Lunch", "Dinner", "Snack"].map((meal) => (
                  <TouchableOpacity key={meal} onPress={() => setManualMealType(meal)} style={[styles.mealTab, manualMealType === meal && styles.mealTabActive]}>
                    <Text style={[styles.mealTabText, manualMealType === meal && { color: colors.surface }]}>{meal}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.twoCol}>
                <Field keyboardType="numeric" label="Quantity" onChangeText={setManualQuantity} value={manualQuantity} />
                <Field label="Unit" onChangeText={setManualUnit} value={manualUnit} />
              </View>
              <View style={styles.twoCol}>
                <Field keyboardType="numeric" label="Calories (kcal)" onChangeText={setManualCalories} value={manualCalories} />
                <Field label="Time" onChangeText={setManualTime} value={manualTime} />
              </View>
              <View style={styles.macroPanel}>
                <Text style={styles.macroKicker}>Macronutrients</Text>
                <View style={styles.threeCol}>
                  <Field keyboardType="numeric" label="Protein (g)" onChangeText={setManualProtein} value={manualProtein} />
                  <Field keyboardType="numeric" label="Carbs (g)" onChangeText={setManualCarbs} value={manualCarbs} />
                  <Field keyboardType="numeric" label="Fats (g)" onChangeText={setManualFat} value={manualFat} />
                </View>
              </View>
              <Field label="Notes" multiline onChangeText={setManualNotes} placeholder="How did you feel? Ingredients?" value={manualNotes} />
              <AppButton icon="save" label="Save Food" onPress={addManualFood} variant="primary" />
            </View>

            <View style={styles.section}>
              <Text style={typography.section}>Supplements today</Text>
              <View style={styles.chipGrid}>
                {supplements.data?.filter((item) => item.active).map((item) => {
                  const name = item.supplement.name;
                  const active = taken.includes(name);
                  return (
                    <TouchableOpacity key={item.id} onPress={() => toggleSupplement(name)} style={[styles.supplementChip, active && styles.supplementChipActive]}>
                      <Ionicons color={active ? colors.surface : colors.muted} name={active ? "checkmark-circle" : "ellipse-outline"} size={17} />
                      <Text style={[styles.supplementText, active && { color: colors.surface }]}>{name} - {item.dose} - {item.time_of_day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {today.isError ? <ErrorState message="Unable to load today's log." /> : null}
            {status ? <Text style={styles.statusText}>{status}</Text> : null}
          </View>
        }
        renderItem={() => null}
        showsVerticalScrollIndicator={false}
      />
    </MobileAppShell>
  );
}

function MacroPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.macroPill}>
      <Text style={styles.macroPillLabel}>{label}</Text>
      <Text style={styles.macroPillValue}>{value}</Text>
    </View>
  );
}

function Field({ label, ...props }: { label: string } & ComponentProps<typeof TextInput>) {
  return (
    <View style={{ flex: 1, gap: spacing.xs }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={colors.placeholder} style={[styles.manualInput, props.multiline && { minHeight: 86, textAlignVertical: "top" }]} {...props} />
    </View>
  );
}

const styles = {
  quickTiles: {
    flexDirection: "row" as const,
    gap: spacing.md,
  },
  quickTile: {
    flex: 1,
    minHeight: 118,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  quickTileText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900" as const,
    textAlign: "center" as const,
  },
  manualCard: {
    ...cards.default,
    gap: spacing.md,
    borderRadius: radii.xl,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800" as const,
  },
  manualInput: {
    minHeight: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
    color: colors.text,
    fontSize: 16,
    fontWeight: "700" as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  mealTabs: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: spacing.xs,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.xs,
  },
  mealTab: {
    minHeight: 38,
    justifyContent: "center" as const,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
  },
  mealTabActive: {
    backgroundColor: colors.primary,
  },
  mealTabText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900" as const,
  },
  twoCol: {
    flexDirection: "row" as const,
    gap: spacing.sm,
  },
  threeCol: {
    flexDirection: "row" as const,
    gap: spacing.xs,
  },
  macroPanel: {
    gap: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.md,
  },
  macroKicker: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900" as const,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
  summary: {
    ...cards.default,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flexWrap: "wrap" as const,
    gap: spacing.md,
    padding: spacing.md,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900" as const,
    textTransform: "uppercase" as const,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900" as const,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 42,
    backgroundColor: colors.borderSoft,
  },
  section: {
    ...cards.default,
    gap: spacing.sm,
    padding: spacing.md,
  },
  resultsPanel: {
    ...cards.default,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  resultsScroller: {
    maxHeight: 292,
  },
  resultsHeader: {
    minHeight: 36,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  resultsCount: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900" as const,
  },
  resultsHeaderActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.xs,
  },
  clearResultsButton: {
    width: 30,
    height: 30,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerLow,
  },
  endText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800" as const,
    paddingVertical: spacing.sm,
    textAlign: "center" as const,
  },
  emptyResults: {
    minHeight: 96,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: spacing.md,
  },
  waterRow: {
    minHeight: 52,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm,
  },
  waterIcon: {
    width: 36,
    height: 36,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.md,
    backgroundColor: colors.blueSoft,
  },
  waterInput: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: "900" as const,
    paddingVertical: 6,
  },
  saveWaterButton: {
    minHeight: 36,
    justifyContent: "center" as const,
    borderRadius: radii.md,
    backgroundColor: colors.blue,
    paddingHorizontal: spacing.md,
  },
  saveWaterText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "900" as const,
  },
  loggedRow: {
    minHeight: 58,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm,
  },
  foodResult: {
    marginBottom: spacing.sm,
    minHeight: 78,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900" as const,
  },
  rowMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700" as const,
  },
  gramsRow: {
    minHeight: 32,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.xs,
  },
  gramsInput: {
    width: 74,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
    color: colors.text,
    fontSize: 13,
    fontWeight: "900" as const,
    paddingHorizontal: spacing.sm,
  },
  addButton: {
    width: 42,
    height: 42,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.md,
    backgroundColor: colors.secondaryContainer,
  },
  macroChips: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: spacing.xs,
  },
  macroPill: {
    borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  macroPillLabel: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "900" as const,
  },
  macroPillValue: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "900" as const,
    marginTop: 1,
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  chipGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: spacing.xs,
  },
  supplementChip: {
    minHeight: 38,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.sm,
  },
  supplementChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  supplementText: {
    maxWidth: 260,
    color: colors.text,
    fontSize: 12,
    fontWeight: "900" as const,
  },
  statusText: {
    color: colors.primary,
    fontWeight: "900" as const,
    textAlign: "center" as const,
  },
};
