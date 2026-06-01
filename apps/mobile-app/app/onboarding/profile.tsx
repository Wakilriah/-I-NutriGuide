import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";
import { z } from "zod";
import { Screen } from "../../src/components/Screen";
import { AppButton, AppCard, AppInput, OnboardingOptionCard, OnboardingShell } from "../../src/components/ui";
import { getProfile, updateProfile } from "../../src/features/profile/api";
import { spacing } from "../../src/theme/design";

const genderOptions = [
  { description: "Use this only for better nutrition estimates.", icon: "female" as const, label: "Female", value: "female" },
  { description: "Use this only for better nutrition estimates.", icon: "male" as const, label: "Male", value: "male" },
  { description: "Keep this private and continue.", icon: "remove-circle" as const, label: "Prefer not to say", value: "prefer_not_to_say" },
];

const schema = z.object({
  age: z.string().regex(/^\d+$/, "Age is required.").refine((value) => Number(value) >= 13, "Age must be at least 13.").refine((value) => Number(value) <= 120, "Age looks too high."),
  gender: z.string().refine((value) => genderOptions.some((option) => option.value === value), "Select a gender option."),
  height_cm: z.string().regex(/^\d+(\.\d+)?$/, "Height is required.").refine((value) => Number(value) >= 80, "Height looks too low.").refine((value) => Number(value) <= 260, "Height looks too high."),
  weight_kg: z.string().regex(/^\d+(\.\d+)?$/, "Weight is required.").refine((value) => Number(value) >= 25, "Weight looks too low.").refine((value) => Number(value) <= 350, "Weight looks too high."),
});

type ProfileValues = z.input<typeof schema>;

export default function ProfileOnboardingScreen() {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
  } = useForm<ProfileValues>({
    resolver: zodResolver(schema),
    defaultValues: { age: "", gender: "", height_cm: "", weight_kg: "" },
  });

  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      try {
        const profile = await getProfile();
        if (mounted) {
          reset({
            age: profile.age ? String(profile.age) : "",
            gender: profile.gender,
            height_cm: profile.height_cm ?? "",
            weight_kg: profile.weight_kg ?? "",
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
        age: Number(values.age),
        gender: values.gender,
        height_cm: Number(values.height_cm),
        weight_kg: Number(values.weight_kg),
      });
      router.replace("/onboarding/allergies" as never);
    } catch {
      setError("age", { message: "Unable to save your profile right now." });
    }
  });

  return (
    <Screen contentStyle={{ paddingBottom: 48 }} showAiAssistant={false}>
      <OnboardingShell current={1} subtitle="Tell us the basics so your daily nutrition path can be tuned gently." title="Let's personalize your wellness plan">
        <View style={{ gap: spacing.sm }}>
          {genderOptions.map((option) => (
            <OnboardingOptionCard active={watch("gender") === option.value} description={option.description} icon={option.icon} key={option.value} label={option.label} onPress={() => setValue("gender", option.value, { shouldValidate: true })} />
          ))}
        </View>

        <AppCard style={{ gap: spacing.md }}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Controller control={control} name="age" render={({ field }) => <AppInput accessibilityLabel="Age" error={errors.age?.message} keyboardType="numeric" label="Age" onChangeText={field.onChange} value={field.value} />} />
            </View>
            <View style={{ flex: 1 }}>
              <Controller control={control} name="weight_kg" render={({ field }) => <AppInput accessibilityLabel="Weight" error={errors.weight_kg?.message} keyboardType="decimal-pad" label="Weight (kg)" onChangeText={field.onChange} value={field.value} />} />
            </View>
          </View>
          <Controller control={control} name="height_cm" render={({ field }) => <AppInput accessibilityLabel="Height" error={errors.height_cm?.message} keyboardType="decimal-pad" label="Height (cm)" onChangeText={field.onChange} value={field.value} />} />
          <AppButton accessibilityLabel="Save profile basics" disabled={isSubmitting} icon="arrow-forward" label={isSubmitting ? "Saving..." : "Next"} onPress={onSubmit} />
        </AppCard>
      </OnboardingShell>
    </Screen>
  );
}
