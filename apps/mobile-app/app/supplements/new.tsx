import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, TouchableOpacity, View } from "react-native";
import { z } from "zod";
import { Screen } from "../../src/components/Screen";
import { AppButton, AppCard, AppInput, AppTopBar, Badge, ErrorState, LoadingState, PageHeader, SearchInput, SupplementCard } from "../../src/components/ui";
import { createUserSupplement, listSupplements } from "../../src/features/supplements/api";
import { colors, radii, spacing } from "../../src/theme/design";

const schema = z.object({
  supplement_id: z.string().regex(/^\d+$/, "Choose a supplement."),
  dose: z.string().min(1, "Dose is required."),
  frequency: z.literal("daily"),
  time_of_day: z.string().min(1, "Time of day is required."),
});

type AddSupplementValues = z.infer<typeof schema>;

export default function AddSupplementScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const catalog = useQuery({ queryKey: ["supplements", search], queryFn: () => listSupplements(search) });
  const mutation = useMutation({
    mutationFn: createUserSupplement,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user-supplements"] });
      router.replace("/tabs/supplements" as never);
    },
  });
  const {
    control,
    formState: { errors },
    getValues,
    handleSubmit,
    setValue,
    watch,
  } = useForm<AddSupplementValues>({
    resolver: zodResolver(schema),
    defaultValues: { supplement_id: "", dose: "", frequency: "daily", time_of_day: "morning" },
  });
  const selectedId = watch("supplement_id");

  const onSubmit = handleSubmit((values) => {
    mutation.mutate({ ...values, supplement_id: Number(values.supplement_id), active: true });
  });

  const chooseSupplement = (supplementId: number, commonDose: string) => {
    setValue("supplement_id", String(supplementId), { shouldValidate: true });
    if (!getValues("dose") && commonDose) {
      setValue("dose", commonDose, { shouldValidate: true });
    }
  };

  return (
    <Screen topBar={<AppTopBar />}>
      <View style={{ gap: spacing.lg }}>
        <PageHeader eyebrow="Supplement setup" title="Add supplement" subtitle="Choose what you take. Supplements are matched as part of a daily routine." />
        {catalog.isLoading ? <LoadingState message="Loading catalog..." /> : null}
        {catalog.isError ? <ErrorState message="Unable to load supplement catalog." /> : null}

        <View style={{ gap: spacing.sm }}>
          <SearchInput onChangeText={setSearch} placeholder="Search supplements" value={search} />
          {catalog.data?.map((supplement) => (
            <TouchableOpacity
              accessibilityLabel={`Choose ${supplement.name}`}
              key={supplement.id}
              onPress={() => chooseSupplement(supplement.id, supplement.common_dose)}
              style={{
                borderRadius: radii.lg,
                borderWidth: selectedId === String(supplement.id) ? 2 : 0,
                borderColor: colors.primary,
              }}
            >
              <SupplementCard active={selectedId === String(supplement.id)} dose={supplement.common_dose} name={supplement.name} />
            </TouchableOpacity>
          ))}
          {!catalog.isLoading && catalog.data?.length === 0 ? <Text style={{ color: colors.muted, fontWeight: "700" }}>No supplements found.</Text> : null}
          {errors.supplement_id ? <Text style={errorStyle}>{errors.supplement_id.message}</Text> : null}
        </View>

        <AppCard style={{ gap: spacing.md }}>
          {(["dose", "time_of_day"] as const).map((fieldName) => (
            <Controller
              control={control}
              key={fieldName}
              name={fieldName}
              render={({ field: { onChange, value } }) => (
                <AppInput
                  accessibilityLabel={fieldName}
                  error={errors[fieldName]?.message}
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

          {mutation.isError ? <ErrorState message="Unable to save supplement. Please try again." /> : null}
          <AppButton accessibilityLabel="Create user supplement" disabled={mutation.isPending} icon="checkmark-circle" label={mutation.isPending ? "Saving" : "Save supplement"} onPress={onSubmit} />
        </AppCard>
      </View>
    </Screen>
  );
}

const errorStyle = { color: colors.danger, fontWeight: "700" as const };
