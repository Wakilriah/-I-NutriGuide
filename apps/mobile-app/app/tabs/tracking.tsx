"use client";

import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { AppButton, AppTopBar, Badge, FoodLogItem, MacroProgressBar, PageHeader, ProgressRing, SafetyAlertCard, TrackingCard, TrackingSummaryCards, WaterTrackerCard } from "../../src/components/ui";
import { getProfile } from "../../src/features/profile/api";
import { getTodayTracking, updateTodayTracking } from "../../src/features/tracking/api";
import { colors, radii, spacing, typography } from "../../src/theme/design";

function toNumber(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function TrackingScreen() {
  const queryClient = useQueryClient();
  const today = useQuery({ queryKey: ["tracking", "today"], queryFn: getTodayTracking });
  const profile = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const [waterMl, setWaterMl] = useState("0");
  const [steps, setSteps] = useState("0");
  const [status, setStatus] = useState("");

  const calorieTarget = profile.data?.goal === "weight_loss" ? 1800 : profile.data?.goal === "muscle" ? 2800 : 2200;
  const proteinTarget = Math.round((toNumber(profile.data?.weight_kg) || 70) * (profile.data?.goal === "muscle" ? 1.8 : 1.2));
  const waterTarget = 2500;
  const stepsTarget = profile.data?.activity_level === "active" ? 10000 : profile.data?.activity_level === "moderate" ? 8000 : profile.data?.activity_level === "light" ? 6000 : 5000;
  const calories = toNumber(today.data?.calories);
  const protein = toNumber(today.data?.protein_g);
  const fiber = toNumber(today.data?.fiber_g);
  const currentWater = toNumber(today.data?.water_ml);
  const currentSteps = toNumber(today.data?.steps);
  const carbs = Math.min(Math.round(calories * 0.12), 260);
  const fat = Math.min(Math.round(calories * 0.025), 70);

  useEffect(() => {
    if (today.data) {
      setWaterMl(String(today.data.water_ml ?? 0));
      setSteps(String(today.data.steps ?? 0));
    }
  }, [today.data]);

  const saveMutation = useMutation({
    mutationFn: (payload: { water_ml?: number; steps?: number }) => updateTodayTracking(payload),
    onError: () => setStatus("Unable to save the update."),
    onSuccess: async () => {
      setStatus("Tracking updated.");
      await queryClient.invalidateQueries({ queryKey: ["tracking"] });
    },
  });

  const saveWater = (nextMl = toNumber(waterMl)) => {
    const normalized = Math.max(0, Math.min(10000, Math.round(nextMl)));
    setWaterMl(String(normalized));
    saveMutation.mutate({ water_ml: normalized });
  };

  const saveSteps = () => {
    const normalized = Math.max(0, Math.min(100000, Math.round(toNumber(steps))));
    setSteps(String(normalized));
    saveMutation.mutate({ steps: normalized });
  };

  return (
    <Screen showAiAssistant topBar={<AppTopBar title="Track" subtitle="Daily wellness" />} contentStyle={{ paddingBottom: 122 }}>
      <View style={{ gap: spacing.lg }}>
        <PageHeader eyebrow="Today's rhythm" title="Small progress counts" subtitle="A calm overview of calories, hydration, movement, and macros." />

        <View style={styles.heroCard}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Badge label="Today" tone="orange" />
            <Text style={styles.heroTitle}>{Math.round(calories).toLocaleString()} kcal logged</Text>
            <Text style={styles.heroText}>{today.data?.food_entries.length ?? 0} foods, {today.data?.supplements_taken.length ?? 0} supplements, {currentWater.toLocaleString()} ml water.</Text>
          </View>
          <ProgressRing color={colors.primary} label="calories" progress={calorieTarget ? calories / calorieTarget : 0} size={110} value={`${Math.round((calories / calorieTarget) * 100) || 0}%`} />
        </View>

        <View style={styles.quickActions}>
          <QuickAction icon="restaurant" label="Add Food" onPress={() => router.push("/tabs/log-food" as never)} />
          <QuickAction icon="water" label="Add Water" onPress={() => saveWater(currentWater + 250)} />
          <QuickAction icon="walk" label="Log Steps" onPress={saveSteps} />
        </View>

        <TrackingSummaryCards
          calorieTarget={calorieTarget}
          calories={calories}
          carbs={carbs}
          carbsTarget={260}
          fat={fat}
          fatTarget={70}
          protein={protein}
          proteinTarget={proteinTarget}
          steps={currentSteps}
          stepsTarget={stepsTarget}
          waterMl={currentWater}
          waterTarget={waterTarget}
        />

        <View style={styles.ringGrid}>
          <View style={styles.ringTile}>
            <ProgressRing color={colors.primary} label="calories" progress={calorieTarget ? calories / calorieTarget : 0} value={`${Math.round(calories)}`} />
          </View>
          <View style={styles.ringTile}>
            <ProgressRing color={colors.tomato} label="steps" progress={stepsTarget ? currentSteps / stepsTarget : 0} value={currentSteps.toLocaleString()} />
          </View>
        </View>

        <WaterTrackerCard onAdd={() => saveWater(currentWater + 250)} targetMl={waterTarget} valueMl={currentWater} />

        <TrackingCard icon="walk" title="Steps">
          <View style={styles.inputRow}>
            <Ionicons color={colors.tomato} name="walk" size={20} />
            <TextInput keyboardType="numeric" onChangeText={setSteps} placeholder="0" placeholderTextColor={colors.placeholder} style={styles.input} value={steps} />
            <TouchableOpacity disabled={saveMutation.isPending} onPress={saveSteps} style={styles.orangeButton}>
              <Text style={styles.orangeButtonText}>{saveMutation.isPending ? "Saving" : "Save"}</Text>
            </TouchableOpacity>
          </View>
          <MacroProgressBar color={colors.tomato} label="Movement" target={stepsTarget} unit="steps" value={currentSteps} />
        </TrackingCard>

        <TrackingCard icon="bar-chart" title="Nutrition">
          <MacroProgressBar color={colors.primary} label="Calories" target={calorieTarget} unit="kcal" value={calories} />
          <MacroProgressBar color={colors.secondaryContainer} label="Protein" target={proteinTarget} value={protein} />
          <MacroProgressBar color={colors.blue} label="Fiber" target={30} value={fiber} />
          <Text style={typography.body}>Carbs and fats use estimated goals until detailed macro entries are connected to tracking.</Text>
          <MacroProgressBar color={colors.warning} label="Carbs" target={260} value={carbs} />
          <MacroProgressBar color={colors.tomato} label="Fat" target={70} value={fat} />
        </TrackingCard>

        <TrackingCard icon="restaurant" title="Food Diary">
          {today.data?.food_entries.length ? (
            today.data.food_entries.slice(0, 4).map((entry, index) => (
              <FoodLogItem calories={entry.calories} key={`${entry.timestamp}-${index}`} name={entry.food_name} protein={entry.protein_g} serving={entry.serving_g} />
            ))
          ) : (
            <Text style={typography.body}>No food logged yet today.</Text>
          )}
          <AppButton icon="add-circle" label="Add food" onPress={() => router.push("/tabs/log-food" as never)} variant="secondary" />
        </TrackingCard>

        <SafetyAlertCard message="Tracking uses your saved profile targets. Medical safety rules still apply inside recommendations before foods are ranked." tone="info" />

        {status ? <Text style={styles.statusText}>{status}</Text> : null}
      </View>
    </Screen>
  );
}

function QuickAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.quickAction}>
      <Ionicons color={colors.primary} name={icon} size={21} />
      <Text style={styles.quickActionText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = {
  heroCard: {
    minHeight: 160,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.primary,
    padding: spacing.lg,
  },
  heroTitle: {
    color: colors.surface,
    fontSize: 26,
    fontWeight: "900" as const,
    lineHeight: 32,
  },
  heroText: {
    color: colors.surfaceOnDark,
    fontSize: 14,
    fontWeight: "700" as const,
    lineHeight: 21,
  },
  ringGrid: {
    flexDirection: "row" as const,
    gap: spacing.sm,
  },
  quickActions: {
    flexDirection: "row" as const,
    gap: spacing.sm,
  },
  quickAction: {
    flex: 1,
    minHeight: 82,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: spacing.xs,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  quickActionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900" as const,
    textAlign: "center" as const,
  },
  ringTile: {
    flex: 1,
    alignItems: "center" as const,
    borderColor: colors.borderSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  inputRow: {
    minHeight: 52,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: "900" as const,
    paddingVertical: 6,
  },
  orangeButton: {
    minHeight: 38,
    justifyContent: "center" as const,
    borderRadius: radii.md,
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: spacing.md,
  },
  orangeButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "900" as const,
  },
  statusText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900" as const,
    textAlign: "center" as const,
  },
};
