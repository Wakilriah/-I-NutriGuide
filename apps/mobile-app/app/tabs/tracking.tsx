import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { AnimatedSection, AppButton, AppCard, AppTopBar, Badge, ErrorState, LoadingState, PageHeader, SectionHeader } from "../../src/components/ui";
import { getProfile } from "../../src/features/profile/api";
import { listUserSupplements } from "../../src/features/supplements/api";
import { getTodayTracking, listTrackingHistory, updateTodayTracking, type DailyTracking } from "../../src/features/tracking/api";
import { colors, iconSizes, radii, spacing, typography } from "../../src/theme/design";

type TrackingDraft = {
  weight_kg: string;
  water_ml: string;
  calories: string;
  protein_g: string;
  fiber_g: string;
  steps: string;
  notes: string;
};

const emptyDraft: TrackingDraft = {
  weight_kg: "",
  water_ml: "0",
  calories: "0",
  protein_g: "0",
  fiber_g: "0",
  steps: "0",
  notes: "",
};

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asDraft(today?: DailyTracking): TrackingDraft {
  if (!today) {
    return emptyDraft;
  }
  return {
    weight_kg: today.weight_kg ?? "",
    water_ml: String(today.water_ml),
    calories: String(today.calories),
    protein_g: String(today.protein_g),
    fiber_g: String(today.fiber_g),
    steps: String(today.steps),
    notes: today.notes,
  };
}

export default function TrackingScreen() {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const supplements = useQuery({ queryKey: ["user-supplements"], queryFn: listUserSupplements });
  const today = useQuery({ queryKey: ["tracking", "today"], queryFn: getTodayTracking });
  const history = useQuery({ queryKey: ["tracking", "history"], queryFn: listTrackingHistory });
  const [draft, setDraft] = useState<TrackingDraft>(emptyDraft);
  const [taken, setTaken] = useState<string[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setDraft(asDraft(today.data));
    setTaken(today.data?.supplements_taken ?? []);
  }, [today.data]);

  const targets = useMemo(() => {
    const weight = Number(profile.data?.weight_kg ?? draft.weight_kg) || 70;
    const goal = profile.data?.goal;
    return {
      water_ml: 2200,
      calories: goal === "weight_loss" ? 1800 : goal === "muscle" ? 2600 : 2200,
      protein_g: Math.round(weight * (goal === "muscle" ? 1.6 : 1.2)),
      fiber_g: 25,
      steps: 8000,
    };
  }, [draft.weight_kg, profile.data?.goal, profile.data?.weight_kg]);

  const metrics = {
    water_ml: toNumber(draft.water_ml),
    calories: toNumber(draft.calories),
    protein_g: toNumber(draft.protein_g),
    fiber_g: toNumber(draft.fiber_g),
    steps: toNumber(draft.steps),
  };
  const completedCount = [
    metrics.water_ml >= targets.water_ml,
    metrics.calories >= targets.calories,
    metrics.protein_g >= targets.protein_g,
    metrics.fiber_g >= targets.fiber_g,
    metrics.steps >= targets.steps,
  ].filter(Boolean).length;
  const allGoalsCompleted = completedCount >= 5;

  const saveMutation = useMutation({
    mutationFn: () =>
      updateTodayTracking({
        weight_kg: draft.weight_kg ? toNumber(draft.weight_kg) : null,
        water_ml: Math.min(metrics.water_ml, 10000),
        calories: Math.min(metrics.calories, 10000),
        protein_g: Math.min(metrics.protein_g, 500),
        fiber_g: Math.min(metrics.fiber_g, 200),
        steps: Math.min(metrics.steps, 100000),
        supplements_taken: taken,
        goals_completed: allGoalsCompleted,
        notes: draft.notes,
      }),
    onError: () => setStatus("Unable to save today's tracking."),
    onSuccess: async () => {
      setStatus(allGoalsCompleted ? "Daily goals completed." : "Saved. Some daily goals still need attention.");
      await queryClient.invalidateQueries({ queryKey: ["tracking"] });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const updateDraft = (field: keyof TrackingDraft, value: string) => {
    setStatus("");
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const toggleSupplement = (name: string) => {
    setStatus("");
    setTaken((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
  };

  return (
    <Screen topBar={<AppTopBar title="Health Insights" />}>
      <View style={{ gap: spacing.lg }}>
        <AnimatedSection>
          <PageHeader eyebrow="Daily Tracking" title="Today" subtitle="Track nutrition goals, body metrics, movement, and supplements taken today." />
        </AnimatedSection>

        {today.isLoading ? <LoadingState message="Loading today's tracking..." /> : null}
        {today.isError ? <ErrorState message="Unable to load today's tracking." /> : null}

        <AnimatedSection delay={60}>
          <AppCard style={{ gap: spacing.sm, backgroundColor: allGoalsCompleted ? colors.primary : colors.warningSoft }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <Ionicons color={allGoalsCompleted ? colors.surface : colors.warning} name={allGoalsCompleted ? "checkmark-circle" : "warning"} size={iconSizes.lg} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: allGoalsCompleted ? colors.surface : colors.warning, fontSize: 18, fontWeight: "900" }}>
                  {allGoalsCompleted ? "Daily goal complete" : "Daily goal not complete"}
                </Text>
                <Text style={{ color: allGoalsCompleted ? colors.surfaceOnDark : colors.warning, lineHeight: 21 }}>
                  {completedCount}/5 goals reached. Save your log after updating what you ate, drank, and took today.
                </Text>
              </View>
            </View>
          </AppCard>
        </AnimatedSection>

        <AnimatedSection delay={100} style={{ gap: spacing.sm }}>
          <SectionHeader title="Nutrition progress" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <ProgressCard label="Water" unit="ml" value={metrics.water_ml} target={targets.water_ml} />
            <ProgressCard label="Calories" unit="kcal" value={metrics.calories} target={targets.calories} tone="orange" />
            <ProgressCard label="Protein" unit="g" value={metrics.protein_g} target={targets.protein_g} />
            <ProgressCard label="Fiber" unit="g" value={metrics.fiber_g} target={targets.fiber_g} tone="orange" />
          </View>
        </AnimatedSection>

        <AnimatedSection delay={150}>
          <AppCard style={{ gap: spacing.md }}>
            <SectionHeader title="Log today" />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <NumberInput label="Weight kg" value={draft.weight_kg} onChangeText={(value) => updateDraft("weight_kg", value)} />
              <NumberInput label="Steps" value={draft.steps} onChangeText={(value) => updateDraft("steps", value)} />
            </View>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <NumberInput label="Water ml" value={draft.water_ml} onChangeText={(value) => updateDraft("water_ml", value)} />
              <NumberInput label="Calories" value={draft.calories} onChangeText={(value) => updateDraft("calories", value)} />
            </View>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <NumberInput label="Protein g" value={draft.protein_g} onChangeText={(value) => updateDraft("protein_g", value)} />
              <NumberInput label="Fiber g" value={draft.fiber_g} onChangeText={(value) => updateDraft("fiber_g", value)} />
            </View>
            <TextInput
              accessibilityLabel="Daily notes"
              multiline
              onChangeText={(value) => updateDraft("notes", value)}
              placeholder="Meals, symptoms, reminders..."
              placeholderTextColor={colors.placeholder}
              style={{
                minHeight: 76,
                borderColor: colors.border,
                borderRadius: radii.lg,
                borderWidth: 1,
                backgroundColor: colors.surfaceSoft,
                color: colors.text,
                padding: spacing.md,
              }}
              value={draft.notes}
            />
          </AppCard>
        </AnimatedSection>

        <AnimatedSection delay={200}>
          <AppCard style={{ gap: spacing.md }}>
            <SectionHeader title="Supplements taken" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
              {supplements.data?.filter((item) => item.active).map((item) => (
                <TouchableOpacity
                  accessibilityLabel={`Track ${item.supplement.name}`}
                  key={item.id}
                  onPress={() => toggleSupplement(item.supplement.name)}
                  style={{
                    minHeight: 42,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 7,
                    borderColor: taken.includes(item.supplement.name) ? colors.primary : colors.border,
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    backgroundColor: taken.includes(item.supplement.name) ? colors.primarySoft : colors.surface,
                    paddingHorizontal: spacing.md,
                  }}
                >
                  <Ionicons color={taken.includes(item.supplement.name) ? colors.primary : colors.muted} name="nutrition" size={iconSizes.sm} />
                  <Text style={{ color: taken.includes(item.supplement.name) ? colors.primary : colors.muted, fontWeight: "900" }}>{item.supplement.name}</Text>
                </TouchableOpacity>
              ))}
              {!supplements.isLoading && !supplements.data?.length ? <Text style={typography.body}>No active supplements to track.</Text> : null}
            </View>
          </AppCard>
        </AnimatedSection>

        <AnimatedSection delay={250}>
          <AppCard style={{ gap: spacing.md }}>
            <SectionHeader title="Trends" />
            <MiniBarChart history={history.data ?? []} metric="calories" title="Calories" target={targets.calories} />
            <MiniBarChart history={history.data ?? []} metric="protein_g" title="Protein" target={targets.protein_g} />
            <MiniBarChart history={history.data ?? []} metric="weight_kg" title="Weight" />
          </AppCard>
        </AnimatedSection>

        {status ? <Text style={status.includes("Unable") ? errorStyle : successStyle}>{status}</Text> : null}
        <AppButton accessibilityLabel="Save daily tracking" disabled={saveMutation.isPending} icon="save" label={saveMutation.isPending ? "Saving" : "Save daily tracking"} onPress={() => saveMutation.mutate()} />
      </View>
    </Screen>
  );
}

function NumberInput({ label, onChangeText, value }: { label: string; onChangeText: (value: string) => void; value: string }) {
  return (
    <View style={{ flex: 1, gap: spacing.xs }}>
      <Text style={typography.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType="decimal-pad"
        onChangeText={onChangeText}
        placeholder="0"
        placeholderTextColor={colors.placeholder}
        style={{
          minHeight: 48,
          borderColor: colors.border,
          borderRadius: radii.md,
          borderWidth: 1,
          backgroundColor: colors.surfaceSoft,
          color: colors.text,
          paddingHorizontal: spacing.md,
        }}
        value={value}
      />
    </View>
  );
}

function ProgressCard({ label, target, tone = "green", unit, value }: { label: string; target: number; tone?: "green" | "orange"; unit: string; value: number }) {
  const percent = Math.max(0, Math.min(100, Math.round((value / Math.max(target, 1)) * 100)));
  const color = tone === "green" ? colors.primary : colors.secondary;
  return (
    <AppCard style={{ flex: 1, minWidth: 150, gap: spacing.xs }}>
      <Text style={{ color: colors.muted, fontWeight: "800" }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 23, fontWeight: "900" }}>{value}{unit}</Text>
      <View style={{ height: 8, overflow: "hidden", borderRadius: radii.pill, backgroundColor: colors.border }}>
        <View style={{ width: `${percent}%`, height: "100%", borderRadius: radii.pill, backgroundColor: color }} />
      </View>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>{percent}% of {target}{unit}</Text>
    </AppCard>
  );
}

function MiniBarChart({ history, metric, target, title }: { history: DailyTracking[]; metric: keyof Pick<DailyTracking, "calories" | "protein_g" | "weight_kg">; target?: number; title: string }) {
  const points = [...history].slice(0, 7).reverse();
  const values = points.map((item) => Number(item[metric] ?? 0));
  const max = Math.max(target ?? 0, ...values, 1);
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: colors.text, fontWeight: "900" }}>{title}</Text>
        {target ? <Badge label={`Target ${target}`} tone="neutral" /> : null}
      </View>
      <View style={{ height: 96, flexDirection: "row", alignItems: "flex-end", gap: 7 }}>
        {points.map((item) => {
          const value = Number(item[metric] ?? 0);
          const height = Math.max(8, Math.round((value / max) * 92));
          return (
            <View key={`${metric}-${item.date}`} style={{ flex: 1, alignItems: "center", gap: 5 }}>
              <View style={{ width: "100%", height, borderRadius: 8, backgroundColor: value >= (target ?? 0) && target ? colors.primary : colors.secondary }} />
              <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800" }}>{item.date.slice(5)}</Text>
            </View>
          );
        })}
        {!points.length ? <Text style={typography.body}>Save daily tracking to start the chart.</Text> : null}
      </View>
    </View>
  );
}

const successStyle = { color: colors.primary, fontWeight: "800" as const };
const errorStyle = { color: colors.danger, fontWeight: "800" as const };
