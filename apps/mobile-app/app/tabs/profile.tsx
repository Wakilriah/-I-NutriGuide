import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, TouchableOpacity, View } from "react-native";
import { z } from "zod";
import { Screen } from "../../src/components/Screen";
import { AnimatedSection, AppButton, AppCard, AppInput, Badge, ErrorState, FilterChip, OptionSelect, PageHeader, SearchInput, SectionHeader, SkeletonCard } from "../../src/components/ui";
import { searchFoods, type FoodSearchItem } from "../../src/features/foods/api";
import { getProfile, parseCommaList, updateProfile } from "../../src/features/profile/api";
import { useAuthStore } from "../../src/stores/auth-store";
import { colors, spacing, typography } from "../../src/theme/design";

const MAX_DISLIKED_FOODS = 12;

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
  age: z.string().regex(/^\d+$/, "Age is required."),
  gender: z.string().refine((value) => genderOptions.some((option) => option.value === value), "Select a gender option."),
  height_cm: z.string().regex(/^\d+(\.\d+)?$/, "Height is required."),
  weight_kg: z.string().regex(/^\d+(\.\d+)?$/, "Weight is required."),
  goal: z.string().refine((value) => goalOptions.some((option) => option.value === value), "Select a goal."),
  activity_level: z.string().refine((value) => activityOptions.some((option) => option.value === value), "Select an activity level."),
  diet_type: z.string().refine((value) => dietOptions.some((option) => option.value === value), "Select a diet type."),
  allergies: z.string(),
  dietary_restrictions: z.string(),
});

type ProfileFormValues = z.infer<typeof schema>;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export default function ProfileScreen() {
  const { clearSession, user } = useAuthStore();
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: getProfile });
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

  const onSave = form.handleSubmit((values) => {
    setStatus("");
    saveMutation.mutate(values);
  });

  return (
    <Screen>
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
                <Controller control={form.control} name="allergies" render={({ field }) => <AppInput accessibilityLabel="Allergies" label="Allergies" onChangeText={field.onChange} placeholder="peanuts, shellfish" value={field.value} />} />
                <Controller control={form.control} name="dietary_restrictions" render={({ field }) => <AppInput accessibilityLabel="Dietary restrictions" label="Dietary restrictions" onChangeText={field.onChange} placeholder="halal, lactose free" value={field.value} />} />
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
