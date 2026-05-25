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
import { getProfile, updateProfile } from "../../src/features/profile/api";
import { spacing } from "../../src/theme/design";

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
        if (!mounted) {
          return;
        }
        reset({
          goal: profile.goal || "general_health",
          activity_level: profile.activity_level,
          diet_type: profile.diet_type || "none",
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
    <Screen>
      <View padding-24 gap-24>
        <ProgressSteps current={3} total={4} />
        
        <AnimatedSection>
          <PageHeader eyebrow="Step 3 of 4" title="Goals" subtitle="What are you hoping to achieve with I-NutriGuide?" />
        </AnimatedSection>

        <AnimatedSection delay={80}>
          <Card padding-24 gap-24>
            <View gap-8>
              <Text label small>Primary Health Goal</Text>
              <View row style={{ flexWrap: "wrap", gap: 8 }}>
                {goalOptions.map(opt => (
                  <FilterChip 
                    key={opt.value} 
                    label={opt.label} 
                    active={watch("goal") === opt.value} 
                    onPress={() => setValue("goal", opt.value)} 
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
                    active={watch("activity_level") === opt.value} 
                    onPress={() => setValue("activity_level", opt.value)} 
                  />
                ))}
              </View>
            </View>

            <View gap-8>
              <Text label small>Current Diet</Text>
              <View row style={{ flexWrap: "wrap", gap: 8 }}>
                {dietOptions.map(opt => (
                  <FilterChip 
                    key={opt.value} 
                    label={opt.label} 
                    active={watch("diet_type") === opt.value} 
                    onPress={() => setValue("diet_type", opt.value)} 
                  />
                ))}
              </View>
            </View>

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
