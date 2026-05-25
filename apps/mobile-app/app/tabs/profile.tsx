"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ScrollView } from "react-native";
import { 
  View, 
  Text, 
  Card, 
  Button, 
  Colors, 
  TouchableOpacity,
  TextField,
  Incubator,
  Badge as UIBadge
} from "react-native-ui-lib";
import { z } from "zod";
import { Screen } from "../../src/components/Screen";
import { AnimatedSection, AppTopBar, Badge, ErrorState, FilterChip, PageHeader, SectionHeader, SearchInput, SkeletonCard } from "../../src/components/ui";
import { searchFoods, type FoodSearchItem } from "../../src/features/foods/api";
import { getProfile, parseCommaList, updateProfile } from "../../src/features/profile/api";
import { getTrackingHistory, type DailyTracking } from "../../src/features/tracking/api";
import { useAuthStore } from "../../src/stores/auth-store";
import { images, spacing, radii } from "../../src/theme/design";

const MAX_DISLIKED_FOODS = 12;
const MAX_ALLERGIES = 8;
const MAX_DIETARY_RESTRICTIONS = 6;

const genderOptions = [
  { icon: "female" as const, label: "Female", value: "female" },
  { icon: "male" as const, label: "Male", value: "male" },
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

export default function ProfileScreen() {
  const { clearSession, user } = useAuthStore();
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const trackingHistory = useQuery({ queryKey: ["tracking", "history"], queryFn: getTrackingHistory });
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
    <Screen topBar={<AppTopBar />}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <AnimatedSection>
          <PageHeader eyebrow="Preferences" title="Profile" subtitle="Personalize your nutritional goals and body context." />
        </AnimatedSection>

        {/* User Card */}
        <AnimatedSection delay={60}>
          <View paddingH-24>
            <Card padding-24 row centerV spread>
              <View>
                <Text h2>{user?.name ?? "User"}</Text>
                <Text body color={Colors.muted}>{user?.email ?? ""}</Text>
              </View>
              <View backgroundColor={Colors.background} padding-12 br100>
                <Ionicons name="person" size={24} color={Colors.primary} />
              </View>
            </Card>
          </View>
        </AnimatedSection>

        {profile.isLoading && <View padding-24><SkeletonCard lines={4} /></View>}
        {profile.isError && <View padding-24><ErrorState message="Failed to load profile." /></View>}

        {profile.data && (
          <View padding-24 gap-24>
            
            {/* Health Context */}
            <Card padding-24 gap-16>
              <SectionHeader title="Physical Stats" />
              <View row gap-16>
                <View flex>
                  <Controller
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <TextField
                        label="Age"
                        placeholder="25"
                        keyboardType="numeric"
                        onChangeText={field.onChange}
                        value={field.value}
                        validationMessage={form.formState.errors.age?.message}
                      />
                    )}
                  />
                </View>
                <View flex>
                  <Controller
                    control={form.control}
                    name="weight_kg"
                    render={({ field }) => (
                      <TextField
                        label="Weight (kg)"
                        placeholder="70"
                        keyboardType="decimal-pad"
                        onChangeText={field.onChange}
                        value={field.value}
                        validationMessage={form.formState.errors.weight_kg?.message}
                      />
                    )}
                  />
                </View>
              </View>
              <Controller
                control={form.control}
                name="height_cm"
                render={({ field }) => (
                  <TextField
                    label="Height (cm)"
                    placeholder="175"
                    keyboardType="decimal-pad"
                    onChangeText={field.onChange}
                    value={field.value}
                    validationMessage={form.formState.errors.height_cm?.message}
                  />
                )}
              />
            </Card>

            {/* Goals & Preferences */}
            <Card padding-24 gap-24>
               <SectionHeader title="Preferences" />
               
               <View gap-8>
                 <Text label small>Primary Goal</Text>
                 <View row style={{ flexWrap: "wrap", gap: 8 }}>
                   {goalOptions.map(opt => (
                     <FilterChip 
                       key={opt.value} 
                       label={opt.label} 
                       active={form.watch("goal") === opt.value} 
                       onPress={() => form.setValue("goal", opt.value, { shouldDirty: true })} 
                     />
                   ))}
                 </View>
               </View>

               <View gap-8>
                 <Text label small>Activity Level</Text>
                 <View row style={{ flexWrap: "wrap", gap: 8 }}>
                   {activityOptions.map(opt => (
                     <FilterChip 
                       key={opt.value} 
                       label={opt.label} 
                       active={form.watch("activity_level") === opt.value} 
                       onPress={() => form.setValue("activity_level", opt.value, { shouldDirty: true })} 
                     />
                   ))}
                 </View>
               </View>
            </Card>

            {/* Disliked Foods */}
            <Card padding-24 gap-16>
              <View row spread centerV>
                <SectionHeader title="Food Dislikes" />
                <UIBadge label={`${selectedDislikedFoods.length}/${MAX_DISLIKED_FOODS}`} backgroundColor={selectedDislikedFoods.length >= MAX_DISLIKED_FOODS ? Colors.error : Colors.primary} />
              </View>
              <SearchInput onChangeText={setFoodQuery} placeholder="Search foods to avoid" value={foodQuery} />
              <View row style={{ flexWrap: "wrap", gap: 6 }}>
                {selectedDislikedFoods.map(food => (
                  <TouchableOpacity key={food} onPress={() => toggleDislikedFood(food)} backgroundColor={Colors.background} br100 paddingH-12 paddingV-6 row centerV>
                    <Text small bold color={Colors.primary}>{food}</Text>
                    <Ionicons name="close" size={14} color={Colors.primary} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            <View marginT-8>
              {status ? <Text bold center color={Colors.primary} marginB-12>{status}</Text> : null}
              <Button 
                label={saveMutation.isPending ? "Saving..." : "Save All Changes"} 
                onPress={onSave}
                disabled={saveMutation.isPending}
                size={Button.sizes.large}
              />
            </View>

            <Button 
              outline 
              label="Log Out" 
              color={Colors.muted} 
              onPress={async () => {
                await clearSession();
                router.replace("/");
              }}
              marginT-8
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
