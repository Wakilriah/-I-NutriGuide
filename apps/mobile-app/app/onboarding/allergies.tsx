import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { z } from "zod";
import { Screen } from "../../src/components/Screen";
import { AppButton, AppCard, FilterChip, OnboardingShell, SafetyAlertCard } from "../../src/components/ui";
import { getProfile, parseCommaList, updateProfile } from "../../src/features/profile/api";
import { colors, spacing, typography } from "../../src/theme/design";

const allergyOptions = ["peanuts", "tree_nuts", "milk", "eggs", "shellfish", "fish", "soy", "wheat", "gluten", "sesame"];
const restrictionOptions = ["vegetarian", "vegan", "pescatarian", "halal", "gluten_free", "lactose_free"];

const schema = z.object({
  allergies: z.string(),
  dietary_restrictions: z.string(),
});

type AllergyValues = z.infer<typeof schema>;

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

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
        if (mounted) {
          reset({
            allergies: profile.allergies.join(", "),
            dietary_restrictions: profile.dietary_restrictions.join(", "),
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
    <Screen contentStyle={{ paddingBottom: 48 }} showAiAssistant={false}>
      <OnboardingShell current={2} subtitle="These filters help keep recommendations relevant and avoid foods you should not eat." title="Any allergies or dietary preferences?">
        <AppCard style={{ gap: spacing.md, backgroundColor: colors.cream }}>
          <Text style={typography.section}>Allergies</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            {allergyOptions.map((value) => (
              <FilterChip active={selectedAllergies.includes(value)} icon="alert-circle" key={value} label={label(value)} onPress={() => toggle("allergies", value, 8)} />
            ))}
          </View>
        </AppCard>

        <AppCard style={{ gap: spacing.md }}>
          <Text style={typography.section}>Diet style</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            {restrictionOptions.map((value) => (
              <FilterChip active={selectedRestrictions.includes(value)} icon="leaf" key={value} label={label(value)} onPress={() => toggle("dietary_restrictions", value, 6)} />
            ))}
          </View>
        </AppCard>

        {errors.allergies?.message ? <SafetyAlertCard message={errors.allergies.message} tone="danger" /> : null}
        <AppButton accessibilityLabel="Save allergy filters" disabled={isSubmitting} icon="arrow-forward" label={isSubmitting ? "Saving..." : "Next"} onPress={onSubmit} />
      </OnboardingShell>
    </Screen>
  );
}
