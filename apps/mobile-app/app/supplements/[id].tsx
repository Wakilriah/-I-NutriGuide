import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Switch, Text, View } from "react-native";
import { z } from "zod";
import { Screen } from "../../src/components/Screen";
import { AppButton, AppCard, AppInput, AppTopBar, Badge, ErrorState, LoadingState, NutrientCard, PageHeader, SectionHeader, SupplementCard } from "../../src/components/ui";
import { deleteUserSupplement, listUserSupplements, updateUserSupplement } from "../../src/features/supplements/api";
import { colors, spacing } from "../../src/theme/design";

const schema = z.object({
  dose: z.string().min(1, "Dose is required."),
  frequency: z.literal("daily"),
  time_of_day: z.string().min(1, "Time of day is required."),
  active: z.boolean(),
});

type EditSupplementValues = z.infer<typeof schema>;

export default function EditSupplementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const supplementId = Number(id);
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ["user-supplements"], queryFn: listUserSupplements });
  const item = list.data?.find((entry) => entry.id === supplementId);
  const form = useForm<EditSupplementValues>({
    resolver: zodResolver(schema),
    values: {
      active: item?.active ?? true,
      dose: item?.dose ?? "",
      frequency: "daily",
      time_of_day: item?.time_of_day ?? "",
    },
  });
  const updateMutation = useMutation({
    mutationFn: (values: EditSupplementValues) => updateUserSupplement(supplementId, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user-supplements"] });
      router.replace("/tabs/supplements" as never);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteUserSupplement(supplementId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user-supplements"] });
      router.replace("/tabs/supplements" as never);
    },
  });

  const onSubmit = form.handleSubmit((values) => updateMutation.mutate(values));

  return (
    <Screen topBar={<AppTopBar />}>
      <View style={{ gap: spacing.lg }}>
        <PageHeader eyebrow="Routine details" title="Edit supplement" subtitle="Adjust how this daily supplement should be used in recommendation matching." />
        {item ? <SupplementCard active={item.active} dose={item.dose} frequency={item.frequency} name={item.supplement.name} timeOfDay={item.time_of_day} /> : null}
        {item ? (
          <AppCard style={{ gap: spacing.sm, backgroundColor: colors.cream }}>
            <SectionHeader title="Best foods to combine" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              <Badge label="Leafy greens" tone="green" />
              <Badge label="Citrus fruits" tone="orange" />
              <Badge label="Lean proteins" tone="neutral" />
            </View>
            <Text style={{ color: colors.muted, lineHeight: 22 }}>
              I-NutriGuide uses nutrient content and association rules to explain which foods may support absorption in simple language.
            </Text>
            <Text style={{ color: colors.danger, fontWeight: "800" }}>Foods to avoid or separate appear in recommendation warnings when they matter.</Text>
          </AppCard>
        ) : null}
        {item ? (
          <NutrientCard
            badge="Timing Recommendation"
            description="Take paired foods near the supplement when they support absorption. Separate known conflicts, such as calcium near iron, when warnings appear."
            icon="time"
            title="Absorption Boost"
          />
        ) : null}
        {list.isLoading ? <LoadingState message="Loading supplement..." /> : null}
        {list.isError ? <ErrorState message="Unable to load supplement." /> : null}
        {!list.isLoading && !item ? <ErrorState message="Supplement entry not found." /> : null}

        <AppCard style={{ gap: spacing.md }}>
          {(["dose", "time_of_day"] as const).map((fieldName) => (
            <Controller
              control={form.control}
              key={fieldName}
              name={fieldName}
              render={({ field: { onChange, value } }) => (
                <AppInput
                  accessibilityLabel={fieldName}
                  error={form.formState.errors[fieldName]?.message}
                  label={fieldName.replaceAll("_", " ")}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          ))}

          <View style={{ minHeight: 58, justifyContent: "center", gap: spacing.xs }}>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: "800" }}>frequency</Text>
            <Badge label="Daily" tone="green" />
          </View>

          <Controller
            control={form.control}
            name="active"
            render={({ field: { onChange, value } }) => (
              <View style={{ minHeight: 64, alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "900" }}>Use in recommendations</Text>
                  <Text style={{ color: colors.muted, marginTop: 3 }}>{value ? "Active" : "Paused"}</Text>
                </View>
                <Switch accessibilityLabel="Use supplement in recommendations" onValueChange={onChange} value={value} />
              </View>
            )}
          />

          <AppButton accessibilityLabel="Update user supplement" disabled={updateMutation.isPending || !item} icon="save" label={updateMutation.isPending ? "Saving" : "Save changes"} onPress={onSubmit} />
          <AppButton accessibilityLabel="Delete user supplement" disabled={deleteMutation.isPending || !item} icon="trash" label={deleteMutation.isPending ? "Removing" : "Remove supplement"} onPress={() => deleteMutation.mutate()} variant="danger" />
        </AppCard>
      </View>
    </Screen>
  );
}
