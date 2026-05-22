import { router } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";
import { z } from "zod";
import { Screen } from "../../src/components/Screen";
import { AnimatedSection, AppButton, AppCard, AppInput, OptionSelect, PageHeader, ProgressSteps } from "../../src/components/ui";
import { getProfile, updateProfile } from "../../src/features/profile/api";
import { spacing } from "../../src/theme/design";

const genderOptions = [
  { icon: "female" as const, label: "Female", value: "female" },
  { icon: "male" as const, label: "Male", value: "male" },
  { icon: "person" as const, label: "Other", value: "other" },
  { icon: "remove-circle" as const, label: "Prefer not to say", value: "prefer_not_to_say" },
];

const schema = z.object({
  age: z
    .string()
    .regex(/^\d+$/, "Age is required.")
    .refine((value) => Number(value) >= 13, "Age must be at least 13.")
    .refine((value) => Number(value) <= 120, "Age looks too high."),
  gender: z.string().refine((value) => genderOptions.some((option) => option.value === value), "Select a gender option."),
  height_cm: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "Height is required.")
    .refine((value) => Number(value) >= 80, "Height looks too low.")
    .refine((value) => Number(value) <= 260, "Height looks too high."),
  weight_kg: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "Weight is required.")
    .refine((value) => Number(value) >= 25, "Weight looks too low.")
    .refine((value) => Number(value) <= 350, "Weight looks too high."),
});

type ProfileValues = z.input<typeof schema>;

export default function ProfileOnboardingScreen() {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
    setError,
  } = useForm<ProfileValues>({
    resolver: zodResolver(schema),
    defaultValues: { age: "", gender: "", height_cm: "", weight_kg: "" },
  });

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const profile = await getProfile();
        if (!mounted) {
          return;
        }
        reset({
          age: profile.age ? String(profile.age) : "",
          gender: profile.gender,
          height_cm: profile.height_cm ?? "",
          weight_kg: profile.weight_kg ?? "",
        });
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
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <ProgressSteps current={1} total={4} />
        <AnimatedSection>
          <PageHeader eyebrow="Step 1 of 4" title="Set up your profile" subtitle="These basics help tune nutrition recommendations to your body context." />
        </AnimatedSection>

        <AnimatedSection delay={80}>
          <AppCard style={{ gap: spacing.md }}>
          <Controller
            control={control}
            name="gender"
            render={({ field: { onChange, value } }) => (
              <OptionSelect error={errors.gender?.message} label="Gender" onSelect={onChange} options={genderOptions} selected={value} />
            )}
          />

          {[
            ["age", "Age", "numeric"],
            ["height_cm", "Height cm", "decimal-pad"],
            ["weight_kg", "Weight kg", "decimal-pad"],
          ].map(([fieldName, label, keyboardType]) => (
            <Controller
              control={control}
              key={fieldName}
              name={fieldName as keyof ProfileValues}
              render={({ field: { onChange, value } }) => (
                <AppInput
                  accessibilityLabel={label}
                  error={errors[fieldName as keyof ProfileValues]?.message}
                  keyboardType={keyboardType as "default" | "numeric" | "decimal-pad"}
                  label={label}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          ))}

          <AppButton accessibilityLabel="Save profile basics" disabled={isSubmitting} icon="arrow-forward" label={isSubmitting ? "Saving" : "Continue"} onPress={onSubmit} />
          </AppCard>
        </AnimatedSection>
      </View>
    </Screen>
  );
}
