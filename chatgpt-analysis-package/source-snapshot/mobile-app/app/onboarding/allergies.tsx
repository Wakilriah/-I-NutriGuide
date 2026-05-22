import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { z } from "zod";
import { Screen } from "../../src/components/Screen";
import { AnimatedSection, AppButton, AppCard, FilterChip, PageHeader, ProgressSteps } from "../../src/components/ui";
import { getProfile, parseCommaList, updateProfile } from "../../src/features/profile/api";
import { colors, spacing, typography } from "../../src/theme/design";

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
  allergies: z.string(),
  dietary_restrictions: z.string(),
});

type AllergyValues = z.infer<typeof schema>;

export default function AllergyOnboardingScreen() {
  const {
    formState: { errors, isSubmitting },
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

  const selectedAllergies = parseCommaList(watch("allergies"));
  const selectedRestrictions = parseCommaList(watch("dietary_restrictions"));

  const toggle = (field: "allergies" | "dietary_restrictions", value: string, limit: number) => {
    const selected = parseCommaList(watch(field));
    const next = selected.includes(value) ? selected.filter((item) => item !== value) : selected.length >= limit ? selected : [...selected, value];
    setValue(field, next.join(", "), { shouldDirty: true, shouldValidate: true });
  };

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

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <ProgressSteps current={2} total={4} />
        <AnimatedSection>
          <PageHeader eyebrow="Step 2 of 4" title="Allergies and diet" subtitle="Choose from the supported options so recommendations can filter foods safely." />
        </AnimatedSection>

        <AnimatedSection delay={80}>
          <AppCard style={{ gap: spacing.md }}>
            <View style={{ gap: spacing.xs }}>
              <Text style={typography.label}>Allergic to</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                {allergyOptions.map((option) => (
                  <FilterChip active={selectedAllergies.includes(option.value)} icon={option.icon} key={option.value} label={option.label} onPress={() => toggle("allergies", option.value, 8)} />
                ))}
              </View>
            </View>
            <View style={{ gap: spacing.xs }}>
              <Text style={typography.label}>Dietary restrictions</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                {restrictionOptions.map((option) => (
                  <FilterChip
                    active={selectedRestrictions.includes(option.value)}
                    icon={option.icon}
                    key={option.value}
                    label={option.label}
                    onPress={() => toggle("dietary_restrictions", option.value, 6)}
                  />
                ))}
              </View>
            </View>

            {errors.allergies ? <Text style={{ color: colors.danger, fontWeight: "800" }}>{errors.allergies.message}</Text> : null}
            <AppButton accessibilityLabel="Save allergy details" disabled={isSubmitting} icon="shield-checkmark" label={isSubmitting ? "Saving" : "Continue"} onPress={onSubmit} />
          </AppCard>
        </AnimatedSection>
      </View>
    </Screen>
  );
}
