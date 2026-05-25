"use client";

import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, ImageBackground } from "react-native";
import { 
  View, 
  Text, 
  Card, 
  Button, 
  ProgressBar, 
  Colors, 
  TouchableOpacity,
  TextField,
  Incubator,
  Icon,
} from "react-native-ui-lib";
import { Screen } from "../../src/components/Screen";
import { AnimatedSection, AppTopBar, Badge, ErrorState, LoadingState, PageHeader, SectionHeader, SearchInput } from "../../src/components/ui";
import { getProfile } from "../../src/features/profile/api";
import { listUserSupplements } from "../../src/features/supplements/api";
import { searchFoods, type FoodSearchItem } from "../../src/features/foods/api";
import { getTodayTracking, updateTodayTracking, type DailyTracking, type FoodEntry } from "../../src/features/tracking/api";
import { colors, radii, spacing, typography } from "../../src/theme/design";

type TrackingDraft = {
  weight_kg: string;
  water_ml: string;
  steps: string;
  notes: string;
};

const emptyDraft: TrackingDraft = {
  weight_kg: "",
  water_ml: "0",
  steps: "0",
  notes: "",
};

function toNumber(value: string) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function TrackingScreen() {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const supplements = useQuery({ queryKey: ["user-supplements"], queryFn: listUserSupplements });
  const today = useQuery({ queryKey: ["tracking", "today"], queryFn: getTodayTracking });
  
  const [draft, setDraft] = useState<TrackingDraft>(emptyDraft);
  const [taken, setTaken] = useState<string[]>([]);
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [status, setStatus] = useState("");
  
  const [foodQuery, setFoodQuery] = useState("");
  const [isAddingFood, setIsAddingFood] = useState(false);

  useEffect(() => {
    if (today.data) {
      setDraft({
        weight_kg: today.data.weight_kg ?? "",
        water_ml: String(today.data.water_ml),
        steps: String(today.data.steps),
        notes: today.data.notes,
      });
      setTaken(today.data.supplements_taken ?? []);
      setFoodEntries(today.data.food_entries ?? []);
    }
  }, [today.data]);

  const targets = useMemo(() => {
    const weight = toNumber(profile.data?.weight_kg ?? draft.weight_kg) || 70;
    const goal = profile.data?.goal;
    return {
      water_ml: 2500,
      calories: goal === "weight_loss" ? 1800 : goal === "muscle" ? 2800 : 2200,
      protein_g: Math.round(weight * (goal === "muscle" ? 1.8 : 1.2)),
      fiber_g: 30,
      steps: 10000,
    };
  }, [draft.weight_kg, profile.data?.goal, profile.data?.weight_kg]);

  const totals = useMemo(() => {
    return foodEntries.reduce((acc, entry) => ({
      calories: acc.calories + entry.calories,
      protein_g: acc.protein_g + entry.protein_g,
    }), { calories: 0, protein_g: 0 });
  }, [foodEntries]);

  const metrics = {
    water_ml: toNumber(draft.water_ml),
    steps: toNumber(draft.steps),
    ...totals,
  };

  const progress = {
    calories: Math.min(metrics.calories / targets.calories, 1),
    protein: Math.min(metrics.protein_g / targets.protein_g, 1),
    water: Math.min(metrics.water_ml / targets.water_ml, 1),
    steps: Math.min(metrics.steps / targets.steps, 1),
  };

  const saveMutation = useMutation({
    mutationFn: (vars: { newEntries?: FoodEntry[], newTaken?: string[] }) =>
      updateTodayTracking({
        weight_kg: draft.weight_kg ? toNumber(draft.weight_kg) : null,
        water_ml: Math.min(metrics.water_ml, 10000),
        calories: Math.round(metrics.calories),
        protein_g: totals.protein_g.toFixed(1),
        steps: Math.min(metrics.steps, 100000),
        supplements_taken: vars.newTaken ?? taken,
        food_entries: vars.newEntries ?? foodEntries,
        notes: draft.notes,
      }),
    onSuccess: async () => {
      setStatus("Tracking updated.");
      await queryClient.invalidateQueries({ queryKey: ["tracking"] });
    },
  });

  const addFood = (food: FoodSearchItem) => {
    const calNutr = food.nutrients.find(n => n.slug === "calories");
    const protNutr = food.nutrients.find(n => n.slug === "protein");
    
    const serving = parseFloat(food.serving_size_g) || 100;
    const calsPerG = (parseFloat(calNutr?.amount ?? "0") / 100);
    const protPerG = (parseFloat(protNutr?.amount ?? "0") / 100);

    const newEntry: FoodEntry = {
      food_id: food.id,
      food_name: food.name,
      serving_g: serving,
      calories: Math.round(serving * calsPerG),
      protein_g: parseFloat((serving * protPerG).toFixed(1)),
      timestamp: new Date().toISOString(),
    };

    const nextEntries = [...foodEntries, newEntry];
    setFoodEntries(nextEntries);
    setIsAddingFood(false);
    setFoodQuery("");
    saveMutation.mutate({ newEntries: nextEntries });
  };

  const removeFood = (index: number) => {
    const nextEntries = foodEntries.filter((_, i) => i !== index);
    setFoodEntries(nextEntries);
    saveMutation.mutate({ newEntries: nextEntries });
  };

  const foodSearch = useQuery({
    enabled: foodQuery.length >= 2,
    queryKey: ["foods", "search", foodQuery],
    queryFn: () => searchFoods(foodQuery),
  });

  return (
    <Screen topBar={<AppTopBar title="Nutrition Log" />}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
        <AnimatedSection>
          <PageHeader eyebrow="Daily Dashboard" title="Daily Tracker" subtitle="Manage your nutrition, hydration, and habits for a better you." />
        </AnimatedSection>

        {today.isLoading ? <LoadingState message="Loading today's tracking..." /> : null}
        {today.isError ? <ErrorState message="Unable to load today's tracking." /> : null}

        {/* Real-world Progress Summary */}
        <AnimatedSection delay={50}>
          <View paddingH-24 marginT-12>
            <Card padding-24>
              <View row spread centerV marginB-16>
                <Text h3>Today's Progress</Text>
                <Badge label={`${Math.round(progress.calories * 100)}%`} tone={progress.calories >= 1 ? "green" : "neutral"} />
              </View>
              
              <View gap-16>
                <ProgressBarComp accent={Colors.primary} current={metrics.calories} label="Calories" target={targets.calories} unit="kcal" />
                <ProgressBarComp accent={Colors.secondary} current={metrics.protein_g} label="Protein" target={targets.protein_g} unit="g" />
                <ProgressBarComp accent={Colors.blue} current={metrics.water_ml} label="Hydration" target={targets.water_ml} unit="ml" />
                <ProgressBarComp accent={Colors.orange} current={metrics.steps} label="Movement" target={targets.steps} unit="steps" />
              </View>
            </Card>
          </View>
        </AnimatedSection>

        {/* Food Logger */}
        <AnimatedSection delay={100}>
          <View paddingH-24 marginT-24>
            <Card padding-24>
              <View row spread centerV marginB-12>
                <Text h3>Meals & Snacks</Text>
                <TouchableOpacity onPress={() => setIsAddingFood(!isAddingFood)}>
                  <Ionicons color={Colors.primary} name={isAddingFood ? "close-circle" : "add-circle"} size={32} />
                </TouchableOpacity>
              </View>

              {isAddingFood && (
                <View marginB-16>
                  <SearchInput onChangeText={setFoodQuery} placeholder="Search foods (e.g. Oats, Chicken...)" value={foodQuery} />
                  {foodSearch.isLoading && <Text body marginT-8 color={Colors.muted}>Searching...</Text>}
                  <View marginT-12 gap-8>
                    {foodSearch.data?.slice(0, 5).map((food) => (
                      <TouchableOpacity 
                        backgroundColor={Colors.background} 
                        br10 
                        key={food.id} 
                        onPress={() => addFood(food)} 
                        padding-16 
                        row 
                        spread
                      >
                        <View>
                          <Text body bold>{food.name}</Text>
                          <Text small color={Colors.muted}>{food.category}</Text>
                        </View>
                        <Ionicons color={Colors.primary} name="add" size={20} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View gap-12>
                {foodEntries.length === 0 ? (
                  <Text body center marginV-24 color={Colors.muted}>No food logged yet today.</Text>
                ) : (
                  foodEntries.map((entry, i) => (
                    <View centerV key={entry.timestamp + i} row spread style={{ borderBottomWidth: 1, borderBottomColor: Colors.background, paddingVertical: 12 }}>
                      <View flex>
                        <Text body bold>{entry.food_name}</Text>
                        <Text small color={Colors.muted}>{entry.serving_g}g - {entry.calories} kcal - {entry.protein_g}g P</Text>
                      </View>
                      <TouchableOpacity onPress={() => removeFood(i)}>
                        <Ionicons color={Colors.error} name="trash-outline" size={18} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </Card>
          </View>
        </AnimatedSection>

        {/* Daily Metrics */}
        <AnimatedSection delay={150}>
          <View paddingH-24 marginT-24>
            <Card padding-24>
              <Text h3 marginB-16>Body & Movement</Text>
              <View row gap-16>
                <MetricInputField flex icon="scale" label="Weight (kg)" onChange={v => setDraft(d => ({ ...d, weight_kg: v }))} value={draft.weight_kg} />
                <MetricInputField flex icon="walk" label="Steps" onChange={v => setDraft(d => ({ ...d, steps: v }))} value={draft.steps} />
              </View>
              <View marginT-16>
                <MetricInputField icon="water" label="Water (ml)" onChange={v => setDraft(d => ({ ...d, water_ml: v }))} value={draft.water_ml} />
              </View>
            </Card>
          </View>
        </AnimatedSection>

        {/* Supplements */}
        <AnimatedSection delay={200}>
          <View paddingH-24 marginT-24>
            <Card padding-24>
              <Text h3 marginB-16>Supplements</Text>
              <View gap-8 row style={{ flexWrap: "wrap" }}>
                {supplements.data?.filter(s => s.active).map((s) => {
                  const isTaken = taken.includes(s.supplement.name);
                  return (
                    <TouchableOpacity 
                      backgroundColor={isTaken ? Colors.primary : Colors.background} 
                      br100 
                      centerV 
                      key={s.id} 
                      onPress={() => {
                        const next = isTaken ? taken.filter(t => t !== s.supplement.name) : [...taken, s.supplement.name];
                        setTaken(next);
                        saveMutation.mutate({ newTaken: next });
                      }} 
                      paddingH-16 
                      paddingV-8 
                      row
                    >
                      <Ionicons color={isTaken ? 'white' : Colors.muted} name={isTaken ? "checkmark-circle" : "ellipse-outline"} size={16} style={{ marginRight: 6 }} />
                      <Text bold color={isTaken ? 'white' : Colors.text}>{s.supplement.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>
          </View>
        </AnimatedSection>

        <View margin-24 paddingB-32>
          {status ? <Text bold center color={Colors.primary} marginB-12>{status}</Text> : null}
          <Button 
            disabled={saveMutation.isPending} 
            label={saveMutation.isPending ? "Syncing..." : "Save Daily Log"} 
            onPress={() => saveMutation.mutate({})} 
            size={Button.sizes.large}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function ProgressBarComp({ label, current, target, unit, accent }: { label: string, current: number, target: number, unit: string, accent: string }) {
  const pct = Math.min((current / target) * 100, 100);
  return (
    <View gap-4>
      <View row spread>
        <Text bold small>{label}</Text>
        <Text small color={Colors.muted}>{Math.round(current)} / {target} {unit}</Text>
      </View>
      <ProgressBar 
        progress={pct} 
        progressColor={accent} 
        style={{ height: 10, borderRadius: 5 }}
      />
    </View>
  );
}

function MetricInputField({ label, value, onChange, icon, flex }: { label: string, value: string, onChange: (v: string) => void, icon: any, flex?: boolean }) {
  return (
    <View flex={flex} gap-6>
      <Text label small>{label}</Text>
      <View backgroundColor={Colors.background} br10 centerV height={48} paddingH-12 row>
        <Ionicons color={Colors.muted} name={icon} size={18} style={{ marginRight: 8 }} />
        <TextField 
          keyboardType="numeric" 
          onChangeText={onChange} 
          style={{ flex: 1, fontWeight: "700", color: Colors.text }} 
          value={value} 
          hideUnderline
        />
      </View>
    </View>
  );
}
