import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Switch, Text, TouchableOpacity, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { AppButton, AppCard, AppTopBar, Badge, ErrorState, LoadingState, NutrientCard, PageHeader, SectionHeader, SupplementCard } from "../../src/components/ui";
import { deleteUserSupplement, listUserSupplements, updateUserSupplement } from "../../src/features/supplements/api";
import { colors, radii, spacing } from "../../src/theme/design";

const doseUnits = ["mg", "g", "mcg", "IU"];
const frequencyOptions = ["daily", "twice daily", "weekly", "as needed"];
const timingOptions = [
  { label: "Morning", value: "morning" },
  { label: "Lunch", value: "lunch" },
  { label: "Evening", value: "evening" },
  { label: "Bedtime", value: "bedtime" },
];

function parseDose(value: string) {
  const match = value.match(/(\d+(?:\.\d+)?)\s*(mcg|mg|g|iu)?/i);
  const unit = match?.[2]?.toLowerCase();
  return {
    amount: match ? Number(match[1]) : 1,
    unit: unit === "iu" ? "IU" : unit || "mg",
  };
}

export default function EditSupplementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const supplementId = Number(id);
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ["user-supplements"], queryFn: listUserSupplements });
  const item = list.data?.find((entry) => entry.id === supplementId);
  const [doseAmount, setDoseAmount] = useState(1);
  const [doseUnit, setDoseUnit] = useState("mg");
  const [frequency, setFrequency] = useState("daily");
  const [timeOfDay, setTimeOfDay] = useState("morning");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!item) {
      return;
    }
    const parsed = parseDose(item.dose);
    setDoseAmount(parsed.amount);
    setDoseUnit(parsed.unit);
    setFrequency(item.frequency || "daily");
    setTimeOfDay(item.time_of_day || "morning");
    setActive(item.active);
  }, [item]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateUserSupplement(supplementId, {
        active,
        dose: `${doseAmount} ${doseUnit}`,
        frequency,
        time_of_day: timeOfDay,
      }),
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

  return (
    <Screen topBar={<AppTopBar />}>
      <View style={{ gap: spacing.lg }}>
        <PageHeader eyebrow="Routine details" title="Edit supplement" subtitle="Adjust dose, timing, frequency, and whether it is active." />
        {item ? <SupplementCard active={item.active} dose={item.dose} frequency={item.frequency} name={item.supplement.name} timeOfDay={item.time_of_day} /> : null}
        {item ? (
          <AppCard style={{ gap: spacing.sm, backgroundColor: colors.cream }}>
            <SectionHeader title="Best foods to combine" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              <Badge label="Leafy greens" tone="green" />
              <Badge label="Citrus fruits" tone="orange" />
              <Badge label="Lean proteins" tone="neutral" />
            </View>
            <Text style={{ color: colors.muted, lineHeight: 22 }}>I-NutriGuide uses nutrient content and association rules to explain which foods may support absorption.</Text>
            <Text style={{ color: colors.danger, fontWeight: "800" }}>Foods to avoid or separate appear in recommendation warnings when they matter.</Text>
          </AppCard>
        ) : null}
        {item ? <NutrientCard badge="Timing Recommendation" description="Take paired foods near the supplement when they support absorption. Separate known conflicts when warnings appear." icon="time" title="Absorption Boost" /> : null}
        {list.isLoading ? <LoadingState message="Loading supplement..." /> : null}
        {list.isError ? <ErrorState message="Unable to load supplement." /> : null}
        {!list.isLoading && !item ? <ErrorState message="Supplement entry not found." /> : null}

        <AppCard style={{ gap: spacing.md }}>
          <View style={{ gap: spacing.xs }}>
            <Text style={styles.label}>Dose</Text>
            <View style={styles.doseRow}>
              <TouchableOpacity onPress={() => setDoseAmount((value) => Math.max(1, value - 1))} style={styles.stepperButton}>
                <Ionicons color={colors.primary} name="remove" size={18} />
              </TouchableOpacity>
              <Text style={styles.doseValue}>{doseAmount}</Text>
              <TouchableOpacity onPress={() => setDoseAmount((value) => value + 1)} style={styles.stepperButton}>
                <Ionicons color={colors.primary} name="add" size={18} />
              </TouchableOpacity>
            </View>
            <View style={styles.optionRow}>
              {doseUnits.map((unit) => (
                <OptionPill key={unit} active={doseUnit === unit} label={unit} onPress={() => setDoseUnit(unit)} />
              ))}
            </View>
          </View>

          <View style={{ gap: spacing.xs }}>
            <Text style={styles.label}>Timing</Text>
            <View style={styles.optionRow}>
              {timingOptions.map((option) => (
                <OptionPill key={option.value} active={timeOfDay === option.value} label={option.label} onPress={() => setTimeOfDay(option.value)} />
              ))}
            </View>
          </View>

          <View style={{ gap: spacing.xs }}>
            <Text style={styles.label}>Frequency</Text>
            <View style={styles.optionRow}>
              {frequencyOptions.map((option) => (
                <OptionPill key={option} active={frequency === option} label={option} onPress={() => setFrequency(option)} />
              ))}
            </View>
          </View>

          <View style={{ minHeight: 64, alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "900" }}>Use in recommendations</Text>
              <Text style={{ color: colors.muted, marginTop: 3 }}>{active ? "Active" : "Paused"}</Text>
            </View>
            <Switch accessibilityLabel="Use supplement in recommendations" onValueChange={setActive} value={active} />
          </View>

          <AppButton accessibilityLabel="Update user supplement" disabled={updateMutation.isPending || !item} icon="save" label={updateMutation.isPending ? "Saving" : "Save changes"} onPress={() => updateMutation.mutate()} />
          <AppButton accessibilityLabel="Delete user supplement" disabled={deleteMutation.isPending || !item} icon="trash" label={deleteMutation.isPending ? "Removing" : "Remove supplement"} onPress={() => deleteMutation.mutate()} variant="danger" />
        </AppCard>
      </View>
    </Screen>
  );
}

function OptionPill({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.optionPill, active && styles.optionPillActive]}>
      <Text style={[styles.optionText, active && { color: colors.surface }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = {
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900" as const,
    textTransform: "uppercase" as const,
  },
  doseRow: {
    minHeight: 48,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
  },
  stepperButton: {
    width: 44,
    height: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  doseValue: {
    minWidth: 70,
    color: colors.text,
    fontSize: 22,
    textAlign: "center" as const,
    fontWeight: "900" as const,
  },
  optionRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: spacing.xs,
  },
  optionPill: {
    minHeight: 36,
    justifyContent: "center" as const,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.sm,
  },
  optionPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800" as const,
  },
};
