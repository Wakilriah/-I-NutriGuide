"use client";

import { Ionicons } from "@expo/vector-icons";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { AppButton, AppTopBar, ErrorState, LoadingState, PageHeader, SearchInput } from "../../src/components/ui";
import { searchFoodsPage } from "../../src/features/foods/api";
import { getProfile, updateProfile } from "../../src/features/profile/api";
import { cards, colors, radii, spacing, typography } from "../../src/theme/design";

const goalOptions = [
  { label: "Health", value: "general_health" },
  { label: "Energy", value: "energy" },
  { label: "Immunity", value: "immunity" },
  { label: "Muscle", value: "muscle" },
  { label: "Weight loss", value: "weight_loss" },
  { label: "Digestion", value: "digestive_health" },
];
const activityOptions = [
  { label: "Light", value: "light" },
  { label: "Moderate", value: "moderate" },
  { label: "Active", value: "active" },
  { label: "Very active", value: "very_active" },
];
const dietOptions = [
  { label: "None", value: "none" },
  { label: "Vegetarian", value: "vegetarian" },
  { label: "Vegan", value: "vegan" },
  { label: "Pescatarian", value: "pescatarian" },
  { label: "Keto", value: "keto" },
  { label: "Mediterranean", value: "mediterranean" },
];
const allergyOptions = [
  { label: "Peanuts", value: "peanuts" },
  { label: "Tree nuts", value: "tree_nuts" },
  { label: "Milk", value: "milk" },
  { label: "Eggs", value: "eggs" },
  { label: "Shellfish", value: "shellfish" },
  { label: "Fish", value: "fish" },
  { label: "Soy", value: "soy" },
  { label: "Wheat", value: "wheat" },
  { label: "Gluten", value: "gluten" },
  { label: "Sesame", value: "sesame" },
];
const restrictionOptions = [
  { label: "Vegetarian", value: "vegetarian" },
  { label: "Vegan", value: "vegan" },
  { label: "Pescatarian", value: "pescatarian" },
  { label: "Halal", value: "halal" },
  { label: "Gluten free", value: "gluten_free" },
  { label: "Lactose free", value: "lactose_free" },
];

function toNumber(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateBmi(weightKg: string, heightCm: string) {
  const weight = toNumber(weightKg);
  const heightM = toNumber(heightCm) / 100;
  return weight > 0 && heightM > 0 ? weight / (heightM * heightM) : 0;
}

export default function ProfileInfoScreen() {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [goal, setGoal] = useState("general_health");
  const [activity, setActivity] = useState("");
  const [diet, setDiet] = useState("none");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [dislikedFoods, setDislikedFoods] = useState<string[]>([]);
  const [foodQuery, setFoodQuery] = useState("");
  const [status, setStatus] = useState("");
  const bmi = calculateBmi(weightKg, heightCm);

  const foodSearch = useInfiniteQuery({
    enabled: foodQuery.trim().length >= 2,
    initialPageParam: 1,
    queryKey: ["foods", "profile-disliked", foodQuery.trim()],
    queryFn: ({ pageParam }) => searchFoodsPage({ page: pageParam, search: foodQuery.trim() }),
    getNextPageParam: (lastPage, allPages) => (lastPage.next ? allPages.length + 1 : undefined),
  });
  const foodResults = foodSearch.data?.pages.flatMap((page) => page.results) ?? [];

  useEffect(() => {
    if (!profile.data) {
      return;
    }
    setAge(profile.data.age ? String(profile.data.age) : "");
    setHeightCm(profile.data.height_cm ?? "");
    setWeightKg(profile.data.weight_kg ?? "");
    setGoal(profile.data.goal || "general_health");
    setActivity(profile.data.activity_level || "");
    setDiet(profile.data.diet_type || "none");
    setAllergies(profile.data.allergies);
    setRestrictions(profile.data.dietary_restrictions);
    setDislikedFoods(profile.data.disliked_foods);
  }, [profile.data]);

  const mutation = useMutation({
    mutationFn: () =>
      updateProfile({
        age: age ? Number(age) : null,
        height_cm: heightCm ? Number(heightCm) : null,
        weight_kg: weightKg ? Number(weightKg) : null,
        goal,
        activity_level: activity,
        diet_type: diet,
        allergies,
        dietary_restrictions: restrictions,
        disliked_foods: dislikedFoods,
      }),
    onError: () => setStatus("Unable to save profile changes."),
    onSuccess: async () => {
      setStatus("Profile updated.");
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const toggleList = (value: string, selected: string[], setSelected: (next: string[]) => void) => {
    setSelected(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };

  return (
    <Screen topBar={<AppTopBar title="Personal Info" />} contentStyle={{ paddingBottom: 104 }}>
      <View style={{ gap: spacing.lg }}>
        <PageHeader eyebrow="Profile" title="Personal info" subtitle="Edit the profile used for goals, graphs, and recommendations." />
        {profile.isLoading ? <LoadingState message="Loading profile..." /> : null}
        {profile.isError ? <ErrorState message="Unable to load profile." /> : null}
        {profile.data ? (
          <>
            <View style={styles.grid}>
              <Field icon="calendar" keyboardType="numeric" label="Age" onChangeText={setAge} value={age} />
              <Field icon="scale" keyboardType="numeric" label="Weight kg" onChangeText={setWeightKg} value={weightKg} />
              <Field icon="resize" keyboardType="numeric" label="Height cm" onChangeText={setHeightCm} value={heightCm} />
              <View style={styles.tile}>
                <Ionicons color={colors.secondary} name="body" size={20} />
                <Text style={styles.inputLabel}>BMI</Text>
                <Text style={styles.bmiValue}>{bmi ? bmi.toFixed(1) : "--"}</Text>
                <Text style={styles.bmiLabel}>{bmi ? (bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy range" : bmi < 30 ? "Overweight" : "High") : "Enter height and weight"}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={typography.section}>Goals and diet</Text>
              <OptionGroup label="Goal" onSelect={setGoal} options={goalOptions} selected={goal} />
              <OptionGroup label="Activity" onSelect={setActivity} options={activityOptions} selected={activity} />
              <OptionGroup label="Diet" onSelect={setDiet} options={dietOptions} selected={diet} />
            </View>

            <View style={styles.card}>
              <Text style={typography.section}>Food preferences</Text>
              <MultiOptionGroup label="Allergies" onToggle={(value) => toggleList(value, allergies, setAllergies)} options={allergyOptions} selected={allergies} />
              <MultiOptionGroup label="Restrictions" onToggle={(value) => toggleList(value, restrictions, setRestrictions)} options={restrictionOptions} selected={restrictions} />
              <View style={{ gap: spacing.xs }}>
                <Text style={styles.inputLabel}>Disliked foods</Text>
                <View style={styles.optionRow}>
                  {dislikedFoods.map((food) => (
                    <TouchableOpacity key={food} onPress={() => setDislikedFoods(dislikedFoods.filter((item) => item !== food))} style={[styles.optionPill, styles.optionPillActive]}>
                      <Text style={[styles.optionText, { color: colors.surface }]}>{food}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <SearchInput onChangeText={setFoodQuery} placeholder="Search foods to avoid" value={foodQuery} />
                <View style={{ gap: spacing.xs }}>
                  {foodResults.slice(0, 8).map((food) => (
                    <TouchableOpacity key={food.id} onPress={() => !dislikedFoods.includes(food.name) && setDislikedFoods([...dislikedFoods, food.name])} style={styles.foodResult}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.foodName}>{food.name}</Text>
                        <Text style={styles.foodMeta}>{food.category || "Food"}</Text>
                      </View>
                      <Ionicons color={dislikedFoods.includes(food.name) ? colors.primary : colors.muted} name={dislikedFoods.includes(food.name) ? "checkmark-circle" : "add-circle-outline"} size={20} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {status ? <Text style={mutation.isError ? styles.errorText : styles.successText}>{status}</Text> : null}
            <AppButton disabled={mutation.isPending} icon="save" label={mutation.isPending ? "Saving..." : "Save profile"} onPress={() => mutation.mutate()} />
          </>
        ) : null}
      </View>
    </Screen>
  );
}

function Field({ icon, keyboardType, label, onChangeText, value }: { icon: keyof typeof Ionicons.glyphMap; keyboardType?: "numeric"; label: string; onChangeText: (value: string) => void; value: string }) {
  return (
    <View style={styles.tile}>
      <Ionicons color={colors.primary} name={icon} size={20} />
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput keyboardType={keyboardType} onChangeText={onChangeText} placeholder="0" placeholderTextColor={colors.placeholder} style={styles.input} value={value} />
    </View>
  );
}

function OptionGroup({ label, onSelect, options, selected }: { label: string; onSelect: (value: string) => void; options: Array<{ label: string; value: string }>; selected: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map((option) => {
          const active = selected === option.value;
          return (
            <TouchableOpacity key={option.value} onPress={() => onSelect(option.value)} style={[styles.optionPill, active && styles.optionPillActive]}>
              <Text style={[styles.optionText, active && { color: colors.surface }]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function MultiOptionGroup({ label, onToggle, options, selected }: { label: string; onToggle: (value: string) => void; options: Array<{ label: string; value: string }>; selected: string[] }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <TouchableOpacity key={option.value} onPress={() => onToggle(option.value)} style={[styles.optionPill, active && styles.optionPillActive]}>
              <Text style={[styles.optionText, active && { color: colors.surface }]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = {
  grid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: spacing.sm,
  },
  tile: {
    ...cards.default,
    minWidth: "48%" as const,
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  inputLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900" as const,
    textTransform: "uppercase" as const,
  },
  input: {
    minHeight: 38,
    color: colors.text,
    fontSize: 18,
    fontWeight: "900" as const,
    paddingVertical: 4,
  },
  bmiValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900" as const,
  },
  bmiLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800" as const,
  },
  card: {
    ...cards.default,
    gap: spacing.md,
    padding: spacing.md,
  },
  optionRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: spacing.xs,
  },
  optionPill: {
    minHeight: 36,
    justifyContent: "center" as const,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.sm,
  },
  optionPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900" as const,
  },
  foodResult: {
    minHeight: 48,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm,
  },
  foodName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900" as const,
  },
  foodMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700" as const,
    marginTop: 2,
  },
  successText: {
    color: colors.primary,
    fontWeight: "900" as const,
    textAlign: "center" as const,
  },
  errorText: {
    color: colors.danger,
    fontWeight: "900" as const,
    textAlign: "center" as const,
  },
};
