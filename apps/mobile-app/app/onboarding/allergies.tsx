import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { 
  View, 
  Text, 
  Card, 
  Button, 
  Colors, 
} from "react-native-ui-lib";
import { z } from "zod";
import { Screen } from "../../src/components/Screen";
import { AnimatedSection, PageHeader, ProgressSteps, FilterChip } from "../../src/components/ui";
import { getProfile, parseCommaList, updateProfile } from "../../src/features/profile/api";
import { spacing } from "../../src/theme/design";

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
      <View padding-24 gap-24>
        <ProgressSteps current={2} total={4} />
        
        <AnimatedSection>
          <PageHeader eyebrow="Step 2 of 4" title="Dietary Filters" subtitle="We'll use these to ensure your recommendations are safe and relevant." />
        </AnimatedSection>

        <AnimatedSection delay={80}>
          <Card padding-24 gap-24>
            <View gap-8>
              <Text label small>Allergies</Text>
              <View row style={{ flexWrap: "wrap", gap: 8 }}>
                {allergyOptions.map(opt => (
                  <FilterChip 
                    key={opt.value} 
                    label={opt.label} 
                    active={selectedAllergies.includes(opt.value)} 
                    onPress={() => toggle("allergies", opt.value, 8)} 
                  />
                ))}
              </View>
            </View>

            <View gap-8>
              <Text label small>Dietary Preferences</Text>
              <View row style={{ flexWrap: "wrap", gap: 8 }}>
                {restrictionOptions.map(opt => (
                  <FilterChip 
                    key={opt.value} 
                    label={opt.label} 
                    active={selectedRestrictions.includes(opt.value)} 
                    onPress={() => toggle("dietary_restrictions", opt.value, 6)} 
                  />
                ))}
              </View>
            </View>

            {errors.allergies && <Text small color={Colors.error}>{errors.allergies.message}</Text>}
            
            <Button 
              label={isSubmitting ? "Saving..." : "Continue"} 
              disabled={isSubmitting} 
              onPress={onSubmit} 
              size={Button.sizes.large}
            />
          </Card>
        </AnimatedSection>
      </View>
    </Screen>
  );
}
