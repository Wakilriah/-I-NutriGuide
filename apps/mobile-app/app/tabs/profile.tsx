import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, TouchableOpacity, View } from "react-native";
import { z } from "zod";
import { Screen } from "../../src/components/Screen";
import { AnimatedSection, AppButton, AppCard, AppInput, AppTopBar, Badge, ErrorState, FilterChip, OptionSelect, PageHeader, SearchInput, SectionHeader, SkeletonCard } from "../../src/components/ui";
import { searchFoods, type FoodSearchItem } from "../../src/features/foods/api";
import { getProfile, parseCommaList, updateProfile } from "../../src/features/profile/api";
import { listTrackingHistory, type DailyTracking } from "../../src/features/tracking/api";
import { useAuthStore } from "../../src/stores/auth-store";
import { colors, iconSizes, radii, spacing, typography } from "../../src/theme/design";

const MAX_DISLIKED_FOODS = 12;
const MAX_ALLERGIES = 8;
const MAX_DIETARY_RESTRICTIONS = 6;

const genderOptions = [
  { icon: "female" as const, label: "Female", value: "female" },
  { icon: "male" as const, label: "Male", value: "male" },
  { icon: "person" as const, label: "Other", value: "other" },
  { icon: "remove-circle" as const, label: "Prefer not to say", value: "prefer_not_to_say" },
];

const goalOptions = [
  { icon: "heart" as const, label: "General health", value: "general_health" },
  { icon: "flash" as const, label: "Energy", value: "energy" },
  { icon: "shield-checkmark" as const, label: "Immunity", value: "immunity" },
  { icon: "barbell" as const, label: "Muscle", value: "muscle" },
  { icon: "leaf" as const, label: "Weight loss", value: "weight_loss" },
  { icon: "happy" as const, label: "Digestive health", value: "digestive_health" },
];

const activityOptions = [
  { icon: "walk" as const, label: "Light", value: "light" },
  { icon: "fitness" as const, label: "Moderate", value: "moderate" },
  { icon: "barbell" as const, label: "Active", value: "active" },
  { icon: "flame" as const, label: "Very active", value: "very_active" },
];

const dietOptions = [
  { icon: "restaurant" as const, label: "No specific diet", value: "none" },
  { icon: "leaf" as const, label: "Vegetarian", value: "vegetarian" },
  { icon: "fish" as const, label: "Pescatarian", value: "pescatarian" },
  { icon: "egg" as const, label: "Keto", value: "keto" },
  { icon: "nutrition" as const, label: "Mediterranean", value: "mediterranean" },
  { icon: "water" as const, label: "Vegan", value: "vegan" },
];

const allergyOptions = [
  { icon: "alert-circle" as const, label: "Peanuts", value: "peanuts" },
  { icon: "alert-circle" as const, label: "Tree nuts", value: "tree_nuts" },
  { icon: "alert-circle" as const, label: "Milk", value: "milk" },
  { icon: "alert-circle" as const, label: "Eggs", value: "eggs" },
  { icon: "alert-circle" as const, label: "Shellfish", value: "shellfish" },
  { icon: "alert-circle" as const, label: "Fish", value: "fish" },
  { icon: "alert-circle" as const, label: "Soy", value: "soy" },
  { icon: "alert-circle" as const, label: "Wheat", value: "wheat" },
  { icon: "alert-circle" as const, label: "Gluten", value: "gluten" },
  { icon: "alert-circle" as const, label: "Sesame", value: "sesame" },
];

const restrictionOptions = [
  { icon: "leaf" as const, label: "Vegetarian", value: "vegetarian" },
  { icon: "water" as const, label: "Vegan", value: "vegan" },
  { icon: "fish" as const, label: "Pescatarian", value: "pescatarian" },
  { icon: "shield-checkmark" as const, label: "Halal", value: "halal" },
  { icon: "restaurant" as const, label: "Gluten free", value: "gluten_free" },
  { icon: "cafe" as const, label: "Lactose free", value: "lactose_free" },
];

const fallbackFoods: FoodSearchItem[] = [
  { id: 1, name: "Broccoli", slug: "broccoli", category: "Vegetables" },
  { id: 2, name: "Mushrooms", slug: "mushrooms", category: "Vegetables" },
  { id: 3, name: "Spinach", slug: "spinach", category: "Vegetables" },
  { id: 4, name: "Sardines", slug: "sardines", category: "Fish" },
  { id: 5, name: "Tofu", slug: "tofu", category: "Protein" },
  { id: 6, name: "Eggplant", slug: "eggplant", category: "Vegetables" },
  { id: 7, name: "Lentils", slug: "lentils", category: "Legumes" },
  { id: 8, name: "Greek yogurt", slug: "greek-yogurt", category: "Dairy" },
];

const schema = z.object({
  age: z.string().regex(/^\d+$/, "Age is required.").refine((value) => {
    const age = Number(value);
    return age >= 13 && age <= 120;
  }, "Age must be between 13 and 120."),
  gender: z.string().refine((value) => genderOptions.some((option) => option.value === value), "Select a gender option."),
  height_cm: z.string().regex(/^\d+(\.\d+)?$/, "Height is required.").refine((value) => {
    const height = Number(value);
    return height >= 80 && height <= 250;
  }, "Height must be between 80 and 250 cm."),
  weight_kg: z.string().regex(/^\d+(\.\d+)?$/, "Weight is required.").refine((value) => {
    const weight = Number(value);
    return weight >= 30 && weight <= 300;
  }, "Weight must be between 30 and 300 kg."),
  goal: z.string().refine((value) => goalOptions.some((option) => option.value === value), "Select a goal."),
  activity_level: z.string().refine((value) => activityOptions.some((option) => option.value === value), "Select an activity level."),
  diet_type: z.string().refine((value) => dietOptions.some((option) => option.value === value), "Select a diet type."),
  allergies: z.string().refine((value) => parseCommaList(value).length <= MAX_ALLERGIES, `Choose up to ${MAX_ALLERGIES} allergies.`),
  dietary_restrictions: z.string().refine((value) => parseCommaList(value).length <= MAX_DIETARY_RESTRICTIONS, `Choose up to ${MAX_DIETARY_RESTRICTIONS} restrictions.`),
});

type ProfileFormValues = z.infer<typeof schema>;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function metricValue(item: DailyTracking, metric: keyof Pick<DailyTracking, "calories" | "protein_g" | "water_ml" | "weight_kg">) {
  const value = Number(item[metric] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function positiveMetricValue(item: DailyTracking, metric: keyof Pick<DailyTracking, "calories" | "protein_g" | "water_ml" | "weight_kg">) {
  const value = metricValue(item, metric);
  return value > 0 ? value : null;
}

function profileWeightGraphPoint(weightKg?: string | null): DailyTracking[] {
  if (!weightKg) {
    return [];
  }
  const now = new Date().toISOString();
  return [
    {
      date: now.slice(0, 10),
      weight_kg: weightKg,
      water_ml: 0,
      calories: 0,
      protein_g: "0",
      fiber_g: "0",
      steps: 0,
      supplements_taken: [],
      goals_completed: false,
      notes: "",
      created_at: now,
      updated_at: now,
    },
  ];
}

function numberFromProfile(value?: string | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function calculateBmi(weightKg?: string | null, heightCm?: string | null) {
  const weight = numberFromProfile(weightKg);
  const height = numberFromProfile(heightCm);
  if (!weight || !height) {
    return null;
  }
  const meters = height / 100;
  return weight / (meters * meters);
}

function bmiLabel(bmi: number | null) {
  if (!bmi) {
    return "Add height and weight";
  }
  if (bmi < 18.5) {
    return "Underweight range";
  }
  if (bmi < 25) {
    return "Healthy range";
  }
  if (bmi < 30) {
    return "Overweight range";
  }
  return "Obesity range";
}

function bmiTone(bmi: number | null): "green" | "orange" | "red" | "neutral" {
  if (!bmi) {
    return "neutral";
  }
  if (bmi >= 18.5 && bmi < 25) {
    return "green";
  }
  if (bmi < 18.5 || bmi < 30) {
    return "orange";
  }
  return "red";
}

function bmiMessage(bmi: number | null) {
  if (!bmi) {
    return "Add your height and weight to calculate BMI.";
  }
  if (bmi < 18.5) {
    return "Your BMI is below the usual healthy range.";
  }
  if (bmi < 25) {
    return "Your BMI is in the usual healthy range.";
  }
  if (bmi < 30) {
    return "Your BMI is above the usual healthy range.";
  }
  return "Your BMI is in a high range. Consider checking your goal with a health professional.";
}

export default function ProfileScreen() {
  const { clearSession, user } = useAuthStore();
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const trackingHistory = useQuery({ queryKey: ["tracking", "history"], queryFn: listTrackingHistory });
  const [foodQuery, setFoodQuery] = useState("");
  const [selectedDislikedFoods, setSelectedDislikedFoods] = useState<string[]>([]);
  const [status, setStatus] = useState("");

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      age: "",
      gender: "",
      height_cm: "",
      weight_kg: "",
      goal: "general_health",
      activity_level: "",
      diet_type: "none",
      allergies: "",
      dietary_restrictions: "",
    },
  });

  useEffect(() => {
    if (!profile.data) {
      return;
    }
    form.reset({
      age: profile.data.age ? String(profile.data.age) : "",
      gender: profile.data.gender,
      height_cm: profile.data.height_cm ?? "",
      weight_kg: profile.data.weight_kg ?? "",
      goal: profile.data.goal || "general_health",
      activity_level: profile.data.activity_level,
      diet_type: profile.data.diet_type || "none",
      allergies: profile.data.allergies.join(", "),
      dietary_restrictions: profile.data.dietary_restrictions.join(", "),
    });
    setSelectedDislikedFoods(profile.data.disliked_foods.slice(0, MAX_DISLIKED_FOODS));
  }, [form, profile.data]);

  const trimmedFoodQuery = foodQuery.trim();
  const foodSearch = useQuery({
    enabled: trimmedFoodQuery.length >= 2,
    queryKey: ["foods", "profile-search", trimmedFoodQuery],
    queryFn: () => searchFoods(trimmedFoodQuery),
  });

  const fallbackMatches = useMemo(() => {
    if (!trimmedFoodQuery) {
      return fallbackFoods;
    }
    const needle = normalize(trimmedFoodQuery);
    return fallbackFoods.filter((food) => normalize(food.name).includes(needle) || normalize(food.category ?? "").includes(needle));
  }, [trimmedFoodQuery]);
  const foodMatches = trimmedFoodQuery.length >= 2 && foodSearch.data?.length ? foodSearch.data : fallbackMatches;
  const hasTrackedWeight = trackingHistory.data?.some((item) => positiveMetricValue(item, "weight_kg")) ?? false;
  const graphHistory = hasTrackedWeight ? trackingHistory.data ?? [] : profileWeightGraphPoint(profile.data?.weight_kg);

  const saveMutation = useMutation({
    mutationFn: (values: ProfileFormValues) =>
      updateProfile({
        age: Number(values.age),
        gender: values.gender,
        height_cm: Number(values.height_cm),
        weight_kg: Number(values.weight_kg),
        goal: values.goal,
        activity_level: values.activity_level,
        diet_type: values.diet_type,
        allergies: parseCommaList(values.allergies),
        dietary_restrictions: parseCommaList(values.dietary_restrictions),
        disliked_foods: selectedDislikedFoods,
      }),
    onError: () => setStatus("Unable to save profile changes right now."),
    onSuccess: async () => {
      setStatus("Profile updated.");
      useAuthStore.getState().setProfileComplete(true);
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["recommendation-history"] });
    },
  });

  const toggleDislikedFood = (name: string) => {
    setStatus("");
    setSelectedDislikedFoods((current) => {
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

  const toggleOptionList = (field: "allergies" | "dietary_restrictions", value: string, limit: number) => {
    setStatus("");
    const selected = parseCommaList(form.getValues(field));
    const next = selected.includes(value) ? selected.filter((item) => item !== value) : selected.length >= limit ? selected : [...selected, value];
    if (!selected.includes(value) && selected.length >= limit) {
      setStatus(`You can choose up to ${limit} ${field.replace("_", " ")}.`);
    }
    form.setValue(field, next.join(", "), { shouldDirty: true, shouldValidate: true });
  };

  const onSave = form.handleSubmit((values) => {
    setStatus("");
    saveMutation.mutate(values);
  });

  return (
    <Screen topBar={<AppTopBar />}>
      <View style={{ gap: spacing.lg }}>
        <AnimatedSection>
          <PageHeader eyebrow="Preferences" title="Profile" subtitle="Change your body context, goals, allergies, diet, and disliked foods from one place." />
        </AnimatedSection>

        <AnimatedSection delay={60}>
          <AppCard style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>{user?.name ?? "No user loaded"}</Text>
            <Text style={{ color: colors.muted }}>{user?.email ?? "No email loaded"}</Text>
          </AppCard>
        </AnimatedSection>

        {profile.isLoading ? (
          <View style={{ gap: spacing.sm }}>
            <SkeletonCard />
            <SkeletonCard lines={2} />
          </View>
        ) : null}
        {profile.isError ? <ErrorState message="Unable to load profile details." /> : null}

        {profile.data ? (
          <>
            <AnimatedSection delay={90}>
              <ProfileProgressPanel
                heightCm={profile.data.height_cm}
                history={graphHistory}
                isLoading={trackingHistory.isLoading}
                showSyncHint={trackingHistory.isError}
                trackingHistory={trackingHistory.data ?? []}
                weightKg={profile.data.weight_kg}
              />
            </AnimatedSection>

            <AnimatedSection delay={100}>
              <AppCard style={{ gap: spacing.md }}>
                <SectionHeader title="Health context" />
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Controller control={form.control} name="age" render={({ field }) => <AppInput accessibilityLabel="Age" error={form.formState.errors.age?.message} keyboardType="numeric" label="Age" onChangeText={field.onChange} value={field.value} />} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Controller control={form.control} name="weight_kg" render={({ field }) => <AppInput accessibilityLabel="Weight kg" error={form.formState.errors.weight_kg?.message} keyboardType="decimal-pad" label="Weight kg" onChangeText={field.onChange} value={field.value} />} />
                  </View>
                </View>
                <Controller control={form.control} name="height_cm" render={({ field }) => <AppInput accessibilityLabel="Height cm" error={form.formState.errors.height_cm?.message} keyboardType="decimal-pad" label="Height cm" onChangeText={field.onChange} value={field.value} />} />
                <Controller control={form.control} name="gender" render={({ field }) => <OptionSelect error={form.formState.errors.gender?.message} label="Gender" onSelect={field.onChange} options={genderOptions} selected={field.value} />} />
              </AppCard>
            </AnimatedSection>

            <AnimatedSection delay={150}>
              <AppCard style={{ gap: spacing.md }}>
                <SectionHeader title="Goals and diet" />
                <Controller control={form.control} name="goal" render={({ field }) => <OptionSelect error={form.formState.errors.goal?.message} label="Goal" onSelect={field.onChange} options={goalOptions} selected={field.value} />} />
                <Controller control={form.control} name="activity_level" render={({ field }) => <OptionSelect error={form.formState.errors.activity_level?.message} label="Activity level" onSelect={field.onChange} options={activityOptions} selected={field.value} />} />
                <Controller control={form.control} name="diet_type" render={({ field }) => <OptionSelect error={form.formState.errors.diet_type?.message} label="Diet type" onSelect={field.onChange} options={dietOptions} selected={field.value} />} />
              </AppCard>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <AppCard style={{ gap: spacing.md }}>
                <SectionHeader title="Allergies and restrictions" />
                <View style={{ gap: spacing.xs }}>
                  <Text style={typography.label}>Allergic to</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                    {allergyOptions.map((option) => (
                      <FilterChip
                        active={parseCommaList(form.watch("allergies")).includes(option.value)}
                        icon={option.icon}
                        key={option.value}
                        label={option.label}
                        onPress={() => toggleOptionList("allergies", option.value, MAX_ALLERGIES)}
                      />
                    ))}
                  </View>
                  {form.formState.errors.allergies ? <Text style={errorStyle}>{form.formState.errors.allergies.message}</Text> : null}
                </View>
                <View style={{ gap: spacing.xs }}>
                  <Text style={typography.label}>Dietary restrictions</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                    {restrictionOptions.map((option) => (
                      <FilterChip
                        active={parseCommaList(form.watch("dietary_restrictions")).includes(option.value)}
                        icon={option.icon}
                        key={option.value}
                        label={option.label}
                        onPress={() => toggleOptionList("dietary_restrictions", option.value, MAX_DIETARY_RESTRICTIONS)}
                      />
                    ))}
                  </View>
                  {form.formState.errors.dietary_restrictions ? <Text style={errorStyle}>{form.formState.errors.dietary_restrictions.message}</Text> : null}
                </View>
              </AppCard>
            </AnimatedSection>

            <AnimatedSection delay={250}>
              <AppCard style={{ gap: spacing.md }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
                  <SectionHeader title="Disliked foods" />
                  <Badge label={`${selectedDislikedFoods.length}/${MAX_DISLIKED_FOODS}`} tone={selectedDislikedFoods.length >= MAX_DISLIKED_FOODS ? "red" : "neutral"} />
                </View>
                <SearchInput onChangeText={setFoodQuery} placeholder="Search foods to dislike" value={foodQuery} />
                {selectedDislikedFoods.length ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                    {selectedDislikedFoods.map((food) => (
                      <FilterChip active icon="close-circle" key={food} label={food} onPress={() => toggleDislikedFood(food)} />
                    ))}
                  </View>
                ) : (
                  <Text style={typography.body}>No disliked foods selected.</Text>
                )}
                <View style={{ gap: spacing.xs }}>
                  {foodSearch.isLoading ? <SkeletonCard lines={1} /> : null}
                  {foodMatches.slice(0, 6).map((food) => {
                    const selected = selectedDislikedFoods.includes(food.name);
                    return (
                      <TouchableOpacity
                        accessibilityLabel={`${selected ? "Remove disliked food" : "Add disliked food"} ${food.name}`}
                        key={`${food.slug}-${food.id}`}
                        onPress={() => toggleDislikedFood(food.name)}
                        style={{
                          minHeight: 44,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderColor: selected ? colors.primary : colors.border,
                          borderRadius: 14,
                          borderWidth: 1,
                          backgroundColor: selected ? colors.primarySoft : colors.surfaceSoft,
                          paddingHorizontal: spacing.md,
                        }}
                      >
                        <Text style={{ color: selected ? colors.primary : colors.text, fontWeight: "900" }}>{food.name}</Text>
                        {food.category ? <Text style={{ color: colors.muted }}>{food.category}</Text> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </AppCard>
            </AnimatedSection>

            {status ? <Text style={status === "Profile updated." ? successStyle : errorStyle}>{status}</Text> : null}
            <AppButton accessibilityLabel="Save profile changes" disabled={saveMutation.isPending} icon="save" label={saveMutation.isPending ? "Saving" : "Save profile changes"} onPress={onSave} />
          </>
        ) : null}

        <AppButton
          accessibilityLabel="Log out"
          icon="log-out"
          label="Log out"
          onPress={async () => {
            await clearSession();
            router.replace("/");
          }}
        />
      </View>
    </Screen>
  );
}

const successStyle = { color: colors.primary, fontWeight: "800" as const };
const errorStyle = { color: colors.danger, fontWeight: "800" as const };

function ProfileProgressPanel({
  heightCm,
  history,
  isLoading,
  showSyncHint,
  trackingHistory,
  weightKg,
}: {
  heightCm?: string | null;
  history: DailyTracking[];
  isLoading?: boolean;
  showSyncHint?: boolean;
  trackingHistory: DailyTracking[];
  weightKg?: string | null;
}) {
  const weight = numberFromProfile(weightKg);
  const height = numberFromProfile(heightCm);
  const bmi = calculateBmi(weightKg, heightCm);
  const latestWeight = history.map((item) => positiveMetricValue(item, "weight_kg")).find((value) => value !== null) ?? weight;

  return (
    <AppCard style={{ gap: spacing.md, overflow: "hidden" }}>
      <View style={{ gap: spacing.xs }}>
        <SectionHeader title="Progress graphs" />
        <Text style={typography.body}>A quick view of your body context and daily nutrition trends.</Text>
      </View>

      {isLoading ? <SkeletonCard lines={2} /> : null}
      {showSyncHint ? <Text style={typography.body}>Daily tracking has not synced yet. Your profile weight is shown as a starting point.</Text> : null}

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <BodyMetricTile icon="pulse" label="BMI" tone={bmiTone(bmi) === "green" ? "green" : "orange"} value={bmi ? bmi.toFixed(1) : "Add data"} />
        <BodyMetricTile icon="body" label="Height" tone="orange" value={height ? `${Math.round(height)} cm` : "Add height"} />
      </View>

      <View
        style={{
          borderColor: colors.borderSoft,
          borderRadius: radii.xl,
          borderWidth: 1,
          backgroundColor: colors.surfaceSoft,
          padding: spacing.md,
          gap: spacing.md,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>Body snapshot</Text>
            <Text style={{ color: colors.muted, lineHeight: 21 }}>BMI {bmi ? bmi.toFixed(1) : "--"} - {bmiLabel(bmi)}</Text>
            <Text style={{ color: colors.muted, lineHeight: 21 }}>{bmiMessage(bmi)}</Text>
          </View>
          <View style={{ borderRadius: radii.pill, backgroundColor: bmiTone(bmi) === "green" ? colors.primarySoft : bmiTone(bmi) === "red" ? colors.dangerSoft : colors.warningSoft, paddingHorizontal: 12, paddingVertical: 7 }}>
            <Text style={{ color: bmiTone(bmi) === "green" ? colors.primary : bmiTone(bmi) === "red" ? colors.danger : colors.warning, fontSize: 12, fontWeight: "900" }}>
              {bmiLabel(bmi)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <BmiTrendChart heightCm={height} history={history} profileWeightKg={latestWeight} />
          </View>
          <HeightRuler heightCm={height} />
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>Nutrition tracking</Text>
        <MiniBarChart accent={colors.secondaryContainer} history={trackingHistory} metric="calories" target={2200} title="Calories" unit="kcal" />
        <MiniBarChart accent={colors.primaryFresh} history={trackingHistory} metric="protein_g" target={90} title="Protein" unit="g" />
        <MiniBarChart accent="#4E8FD8" history={trackingHistory} metric="water_ml" target={2200} title="Water" unit="ml" />
      </View>
    </AppCard>
  );
}

function BodyMetricTile({ icon, label, tone, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; tone: "green" | "orange"; value: string }) {
  const palette = tone === "green"
    ? { backgroundColor: colors.primarySoft, color: colors.primary }
    : { backgroundColor: colors.secondarySoft, color: colors.secondary };

  return (
    <View
      style={{
        flex: 1,
        minHeight: 98,
        borderColor: colors.borderSoft,
        borderRadius: radii.lg,
        borderWidth: 1,
        backgroundColor: colors.surface,
        padding: spacing.md,
        gap: spacing.xs,
      }}
    >
      <View style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: palette.backgroundColor }}>
        <Ionicons color={palette.color} name={icon} size={iconSizes.md} />
      </View>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 19, fontWeight: "900" }}>{value}</Text>
    </View>
  );
}

function BmiTrendChart({ heightCm, history, profileWeightKg }: { heightCm: number | null; history: DailyTracking[]; profileWeightKg: number | null }) {
  const bmiPoints = history
    .slice(0, 7)
    .reverse()
    .map((item) => {
      const weight = positiveMetricValue(item, "weight_kg");
      if (!weight || !heightCm) {
        return null;
      }
      const meters = heightCm / 100;
      return { date: item.date, value: weight / (meters * meters) };
    })
    .filter((item): item is { date: string; value: number } => Boolean(item));

  if (!bmiPoints.length && profileWeightKg && heightCm) {
    const meters = heightCm / 100;
    bmiPoints.push({ date: new Date().toISOString().slice(0, 10), value: profileWeightKg / (meters * meters) });
  }

  const latest = bmiPoints.length ? bmiPoints[bmiPoints.length - 1].value : null;
  const max = Math.max(32, ...bmiPoints.map((point) => point.value), 1);

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "900" }}>BMI trend</Text>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>{latest ? `${latest.toFixed(1)} latest - ${bmiLabel(latest)}` : "Add height and weight"}</Text>
        </View>
        <Badge label="Healthy 18.5-24.9" tone="neutral" />
      </View>
      <View
        style={{
          minHeight: 132,
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 7,
          borderColor: colors.borderSoft,
          borderRadius: radii.lg,
          borderWidth: 1,
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.sm,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
        }}
      >
        {bmiPoints.length ? (
          bmiPoints.map((point) => {
            const height = Math.max(10, Math.round((point.value / max) * 94));
            const tone = bmiTone(point.value);
            const accent = tone === "green" ? colors.primary : tone === "red" ? colors.danger : colors.secondaryContainer;
            return (
              <View key={`bmi-${point.date}`} style={{ flex: 1, alignItems: "center", gap: 5 }}>
                <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800" }}>{point.value.toFixed(1)}</Text>
                <View style={{ width: "100%", height: 96, justifyContent: "flex-end", borderRadius: radii.pill, backgroundColor: colors.surfaceContainerLow, overflow: "hidden" }}>
                  <View style={{ width: "100%", height, borderRadius: radii.pill, backgroundColor: accent }} />
                </View>
                <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800" }}>{point.date.slice(5)}</Text>
              </View>
            );
          })
        ) : (
          <Text style={typography.body}>Add height and weight to see your BMI graph.</Text>
        )}
      </View>
    </View>
  );
}

function HeightRuler({ heightCm }: { heightCm: number | null }) {
  const normalized = heightCm ? Math.min(1, Math.max(0.18, (heightCm - 80) / 170)) : 0.5;
  const fillHeight = Math.round(normalized * 128);

  return (
    <View style={{ width: 72, alignItems: "center", gap: spacing.xs }}>
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "900" }}>Height</Text>
      <View
        style={{
          width: 42,
          height: 142,
          justifyContent: "flex-end",
          borderColor: colors.secondarySoft,
          borderRadius: radii.pill,
          borderWidth: 1,
          backgroundColor: colors.cream,
          padding: 5,
        }}
      >
        <View style={{ height: fillHeight, borderRadius: radii.pill, backgroundColor: colors.secondaryContainer }} />
      </View>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800", textAlign: "center" }}>{heightCm ? `${Math.round(heightCm)} cm` : "No height"}</Text>
    </View>
  );
}

function MiniBarChart({
  accent = colors.secondary,
  history,
  metric,
  target,
  title,
  unit,
}: {
  accent?: string;
  history: DailyTracking[];
  metric: keyof Pick<DailyTracking, "calories" | "protein_g" | "water_ml" | "weight_kg">;
  target?: number;
  title: string;
  unit: string;
}) {
  const points = history
    .slice(0, 7)
    .reverse()
    .filter((item) => positiveMetricValue(item, metric));
  const values = points.map((item) => positiveMetricValue(item, metric) ?? 0);
  const max = Math.max(target ?? 0, ...values, 1);
  const latest = values.length ? values[values.length - 1] : 0;

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "900" }}>{title}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>{latest ? `${Math.round(latest)} ${unit} latest` : "Waiting for data"}</Text>
        </View>
        {target ? <Badge label={`Goal ${target}${unit}`} tone="neutral" /> : null}
      </View>
      <View
        style={{
          minHeight: 122,
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 7,
          borderColor: colors.borderSoft,
          borderRadius: radii.lg,
          borderWidth: 1,
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.sm,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
        }}
      >
        {points.length ? (
          points.map((item) => {
            const value = positiveMetricValue(item, metric) ?? 0;
            const height = Math.max(8, Math.round((value / max) * 86));
            const reachedTarget = target ? value >= target : false;
            return (
              <View key={`${metric}-${item.date}`} style={{ flex: 1, alignItems: "center", gap: 5 }}>
                <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800" }}>{Math.round(value)}</Text>
                <View style={{ width: "100%", height: 92, justifyContent: "flex-end", borderRadius: radii.pill, backgroundColor: colors.surfaceContainerLow, overflow: "hidden" }}>
                  <View style={{ width: "100%", height, borderRadius: radii.pill, backgroundColor: reachedTarget ? colors.primary : accent }} />
                </View>
                <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800" }}>{item.date.slice(5)}</Text>
              </View>
            );
          })
        ) : (
          <Text style={typography.body}>No tracking data yet. Save daily tracking to start this graph.</Text>
        )}
      </View>
    </View>
  );
}
