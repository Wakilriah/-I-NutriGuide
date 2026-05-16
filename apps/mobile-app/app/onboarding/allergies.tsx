import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";
import { z } from "zod";
import { Screen } from "../../src/components/Screen";
import { AllergySelector, AnimatedSection, AppButton, AppCard, AppInput, PageHeader, ProgressSteps } from "../../src/components/ui";
import { getProfile, parseCommaList, updateProfile } from "../../src/features/profile/api";
import { spacing } from "../../src/theme/design";

const schema = z.object({
  allergies: z.string(),
  dietary_restrictions: z.string(),
});

type AllergyValues = z.infer<typeof schema>;

export default function AllergyOnboardingScreen() {
  const {
    control,
    formState: { isSubmitting },
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
  } = useForm<AllergyValues>({
    resolver: zodResolver(schema),
    defaultValues: { allergies: "", dietary_restrictions: "" },
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
          allergies: profile.allergies.join(", "),
          dietary_restrictions: profile.dietary_restrictions.join(", "),
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
        allergies: parseCommaList(values.allergies),
        dietary_restrictions: parseCommaList(values.dietary_restrictions),
      });
      router.replace("/onboarding/goals" as never);
    } catch {
      setError("allergies", { message: "Unable to save allergy details right now." });
    }
  });

  const selectedAllergies = parseCommaList(watch("allergies"));
  const toggleAllergy = (item: string) => {
    const next = selectedAllergies.includes(item) ? selectedAllergies.filter((allergy) => allergy !== item) : [...selectedAllergies, item];
    setValue("allergies", next.join(", "), { shouldDirty: true, shouldValidate: true });
  };

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <ProgressSteps current={2} total={4} />
        <AnimatedSection>
          <PageHeader eyebrow="Step 2 of 4" title="Allergies and diet" subtitle="Tell I-NutriGuide what to avoid. Separate items with commas." />
        </AnimatedSection>

        <AnimatedSection delay={80}>
          <AppCard style={{ gap: spacing.md }}>
          <AllergySelector items={["peanut", "shellfish", "milk", "gluten", "soy"]} onToggle={toggleAllergy} selected={selectedAllergies} />
          <Controller
            control={control}
            name="allergies"
            render={({ field: { onChange, value } }) => (
              <AppInput accessibilityLabel="Allergies" label="Allergies" onChangeText={onChange} placeholder="peanuts, shellfish" value={value} />
            )}
          />
          <Controller
            control={control}
            name="dietary_restrictions"
            render={({ field: { onChange, value } }) => (
              <AppInput
                accessibilityLabel="Dietary restrictions"
                label="Dietary restrictions"
                onChangeText={onChange}
                placeholder="vegetarian, lactose free"
                value={value}
              />
            )}
          />

          <AppButton accessibilityLabel="Save allergy details" disabled={isSubmitting} icon="shield-checkmark" label={isSubmitting ? "Saving" : "Continue"} onPress={onSubmit} />
          </AppCard>
        </AnimatedSection>
      </View>
    </Screen>
  );
}
