import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { z } from "zod";
import { Screen } from "../../src/components/Screen";
import { AppButton, AppCard, FilterChip, OnboardingOptionCard, OnboardingShell, SafetyAlertCard } from "../../src/components/ui";
import { getProfile, updateProfile } from "../../src/features/profile/api";
import { colors, spacing, typography } from "../../src/theme/design";

const goalOptions = [
  { description: "Stay fueled through active days.", icon: "flash" as const, label: "Energy", value: "energy" },
  { description: "Focus on protein and recovery.", icon: "barbell" as const, label: "Muscle", value: "muscle" },
  { description: "Manage calories with high satiety.", icon: "analytics" as const, label: "Weight Loss", value: "weight_loss" },
  { description: "Support vitamins and minerals.", icon: "medical" as const, label: "Deficiency Support", value: "immunity" },
  { description: "Holistic approach to living well.", icon: "leaf" as const, label: "General Wellness", value: "general_health" },
  { description: "Prioritize gut-friendly food choices.", icon: "happy" as const, label: "Digestive Health", value: "digestive_health" },
];

const activityOptions = [
  { label: "Light", value: "light" },
  { label: "Moderate", value: "moderate" },
  { label: "Active", value: "active" },
  { label: "Very active", value: "very_active" },
];

const dietOptions = [
  { label: "No specific diet", value: "none" },
  { label: "Vegetarian", value: "vegetarian" },
  { label: "Pescatarian", value: "pescatarian" },
  { label: "Keto", value: "keto" },
  { label: "Mediterranean", value: "mediterranean" },
  { label: "Vegan", value: "vegan" },
];

const schema = z.object({
  goal: z.string().refine((value) => goalOptions.some((option) => option.value === value), "Select a goal."),
  activity_level: z.string().refine((value) => activityOptions.some((option) => option.value === value), "Select an activity level."),
  diet_type: z.string().refine((value) => dietOptions.some((option) => option.value === value), "Select a diet type."),
});

type GoalValues = z.infer<typeof schema>;

export default function GoalOnboardingScreen() {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
  } = useForm<GoalValues>({
    resolver: zodResolver(schema),
    defaultValues: { goal: "general_health", activity_level: "", diet_type: "none" },
  });

  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      try {
        const profile = await getProfile();
        if (mounted) {
          reset({
            goal: profile.goal || "general_health",
            activity_level: profile.activity_level,
            diet_type: profile.diet_type || "none",
          });
        }
      } catch {
        // Empty defaults are fine for first-time onboarding.
      }
    }
    void loadProfile();
    return () => {
      mounted = false;
    };
  }, [reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateProfile({
        goal: values.goal,
        activity_level: values.activity_level,
        diet_type: values.diet_type,
      });
      router.replace("/onboarding/disliked-foods" as never);
    } catch {
      setError("goal", { message: "Unable to save your goals right now." });
    }
  });

  return (
    <Screen contentStyle={{ paddingBottom: 48 }} showAiAssistant={false}>
      <OnboardingShell current={3} subtitle="This helps our AI personalize your daily nutritional path and nutrient focuses." title="What is your primary health goal?">
        <View style={{ gap: spacing.sm }}>
          {goalOptions.map((option) => (
            <OnboardingOptionCard active={watch("goal") === option.value} description={option.description} icon={option.icon} key={option.value} label={option.label} onPress={() => setValue("goal", option.value, { shouldValidate: true })} />
          ))}
        </View>

        <AppCard style={{ gap: spacing.md }}>
          <Text style={typography.section}>Activity level</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            {activityOptions.map((option) => (
              <FilterChip active={watch("activity_level") === option.value} icon="walk" key={option.value} label={option.label} onPress={() => setValue("activity_level", option.value, { shouldValidate: true })} />
            ))}
          </View>
        </AppCard>

        <AppCard style={{ gap: spacing.md, backgroundColor: colors.cream }}>
          <Text style={typography.section}>Current diet</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            {dietOptions.map((option) => (
              <FilterChip active={watch("diet_type") === option.value} icon="restaurant" key={option.value} label={option.label} onPress={() => setValue("diet_type", option.value, { shouldValidate: true })} />
            ))}
          </View>
        </AppCard>

        {errors.goal?.message || errors.activity_level?.message || errors.diet_type?.message ? (
          <SafetyAlertCard message={errors.goal?.message || errors.activity_level?.message || errors.diet_type?.message || "Please complete your goal preferences."} tone="danger" />
        ) : null}
        <AppButton accessibilityLabel="Save goals" disabled={isSubmitting} icon="arrow-forward" label={isSubmitting ? "Saving..." : "Next"} onPress={onSubmit} />
      </OnboardingShell>
    </Screen>
  );
}
