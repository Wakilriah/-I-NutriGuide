import { router } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { 
  View, 
  Text, 
  Card, 
  Button, 
  Colors, 
  TextField,
} from "react-native-ui-lib";
import { z } from "zod";
import { Screen } from "../../src/components/Screen";
import { AnimatedSection, PageHeader, ProgressSteps, FilterChip } from "../../src/components/ui";
import { getProfile, updateProfile } from "../../src/features/profile/api";
import { spacing } from "../../src/theme/design";

const genderOptions = [
  { icon: "female" as const, label: "Female", value: "female" },
  { icon: "male" as const, label: "Male", value: "male" },
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
    watch,
    setValue,
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
      <View padding-24 gap-24>
        <ProgressSteps current={1} total={4} />
        
        <AnimatedSection>
          <PageHeader eyebrow="Getting Started" title="Basics" subtitle="Tell us a bit about yourself to help tune your AI nutritionist." />
        </AnimatedSection>

        <AnimatedSection delay={80}>
          <Card padding-24 gap-24>
            <View gap-8>
              <Text label small>Gender Identity</Text>
              <View row style={{ flexWrap: "wrap", gap: 8 }}>
                {genderOptions.map(opt => (
                  <FilterChip 
                    key={opt.value} 
                    label={opt.label} 
                    active={watch("gender") === opt.value} 
                    onPress={() => setValue("gender", opt.value)} 
                  />
                ))}
              </View>
              {errors.gender && <Text small color={Colors.error}>{errors.gender.message}</Text>}
            </View>

            <View row gap-16>
              <View flex>
                <Controller
                  control={control}
                  name="age"
                  render={({ field }) => (
                    <TextField
                      label="Age"
                      placeholder="25"
                      keyboardType="numeric"
                      onChangeText={field.onChange}
                      value={field.value}
                      validationMessage={errors.age?.message}
                    />
                  )}
                />
              </View>
              <View flex>
                <Controller
                  control={control}
                  name="weight_kg"
                  render={({ field }) => (
                    <TextField
                      label="Weight (kg)"
                      placeholder="70"
                      keyboardType="decimal-pad"
                      onChangeText={field.onChange}
                      value={field.value}
                      validationMessage={errors.weight_kg?.message}
                    />
                  )}
                />
              </View>
            </View>

            <Controller
              control={control}
              name="height_cm"
              render={({ field }) => (
                <TextField
                  label="Height (cm)"
                  placeholder="175"
                  keyboardType="decimal-pad"
                  onChangeText={field.onChange}
                  value={field.value}
                  validationMessage={errors.height_cm?.message}
                />
              )}
            />

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
