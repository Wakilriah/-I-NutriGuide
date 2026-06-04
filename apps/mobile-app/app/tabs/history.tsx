"use client";

import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Dimensions, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from "react-native-svg";
import { Screen } from "../../src/components/Screen";
import { AppTopBar, Badge, EmptyState, ErrorState, FoodLogItem, LoadingState, PageHeader } from "../../src/components/ui";
import { getProfile } from "../../src/features/profile/api";
import { getTrackingHistory, type DailyTracking } from "../../src/features/tracking/api";
import { cards, colors, radii, spacing, typography } from "../../src/theme/design";
import { useState } from "react";

type MetricKey = "calories" | "protein_g" | "fiber_g" | "water_ml" | "steps" | "weight_kg" | "bmi";

const metrics: Array<{ key: MetricKey; label: string; unit: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "calories", label: "Calories", unit: "kcal", color: colors.primary, icon: "flame" },
  { key: "protein_g", label: "Protein", unit: "g", color: colors.secondaryContainer, icon: "barbell" },
  { key: "fiber_g", label: "Fiber", unit: "g", color: colors.secondary, icon: "leaf" },
  { key: "water_ml", label: "Water", unit: "ml", color: colors.blue, icon: "water" },
  { key: "steps", label: "Steps", unit: "", color: colors.tomato, icon: "walk" },
  { key: "weight_kg", label: "Weight", unit: "kg", color: colors.warning, icon: "scale" },
  { key: "bmi", label: "BMI", unit: "", color: colors.secondary, icon: "body" },
];

function toNumber(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function valueFor(day: DailyTracking, key: MetricKey, heightCm = 0, profileWeightKg = 0) {
  const weight = toNumber(day.weight_kg) || profileWeightKg;
  if (key === "bmi") {
    const heightM = heightCm / 100;
    return weight > 0 && heightM > 0 ? weight / (heightM * heightM) : 0;
  }
  if (key === "weight_kg") {
    return weight;
  }
  return toNumber(day[key]);
}

function formatValue(value: number, unit: string) {
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded.toLocaleString()}${unit ? ` ${unit}` : ""}`;
}

export default function HistoryScreen() {
  const history = useQuery({ queryKey: ["tracking", "history"], queryFn: getTrackingHistory });
  const profile = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const [selected, setSelected] = useState(metrics[0]);
  const days = (history.data ?? []).slice().sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  const latest = days[days.length - 1];
  const heightCm = toNumber(profile.data?.height_cm);
  const profileWeightKg = toNumber(profile.data?.weight_kg);

  return (
    <Screen topBar={<AppTopBar title="History" />} contentStyle={{ paddingBottom: 104 }}>
      <View style={{ gap: spacing.lg }}>
        <PageHeader eyebrow="Food diary" title="Daily Food Diary" subtitle="Review foods, meal totals, and recent wellness trends." />
        {history.isLoading ? <LoadingState message="Loading history..." /> : null}
        {history.isError ? <ErrorState message="Unable to load tracking history." /> : null}
        {!history.isLoading && days.length === 0 ? <EmptyState icon="bar-chart" title="No history yet" message="Start logging food and habits to build your trend charts." /> : null}

        {days.length ? (
          <>
            <View style={styles.diaryCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Latest logged foods</Text>
                <Badge label={latest.food_entries.length ? `${latest.food_entries.length} items` : "Empty"} tone="neutral" />
              </View>
              {latest.food_entries.length ? (
                ["Breakfast", "Lunch", "Dinner", "Snack"].map((meal) => {
                  const entries = latest.food_entries.filter((entry) => mealForEntry(entry.food_name) === meal);
                  if (!entries.length) {
                    return null;
                  }
                  const mealCalories = entries.reduce((sum, entry) => sum + entry.calories, 0);
                  return (
                    <View key={meal} style={{ gap: spacing.xs }}>
                      <View style={styles.mealHeader}>
                        <Text style={styles.mealTitle}>{meal}</Text>
                        <Text style={styles.mealMeta}>{mealCalories} kcal</Text>
                      </View>
                      {entries.map((entry, index) => (
                        <FoodLogItem calories={entry.calories} key={`${entry.timestamp}-${index}`} name={entry.food_name.replace(` (${meal})`, "")} protein={entry.protein_g} serving={entry.serving_g} />
                      ))}
                    </View>
                  );
                })
              ) : (
                <Text style={typography.body}>No foods were logged on the latest day.</Text>
              )}
            </View>

            <View style={styles.summary}>
              <View style={styles.summaryIcon}>
                <Ionicons color={colors.surface} name={selected.icon} size={24} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Latest {selected.label.toLowerCase()}</Text>
                <Text style={styles.summaryValue}>{formatValue(valueFor(latest, selected.key, heightCm, profileWeightKg), selected.unit)}</Text>
                <Text style={styles.summarySubtext}>Height {heightCm ? `${heightCm} cm` : "not set"} - profile weight {profileWeightKg ? `${profileWeightKg} kg` : "not set"}</Text>
              </View>
              <Badge label={`${days.length} days`} tone="neutral" />
            </View>

            <View style={styles.metricGrid}>
              {metrics.map((metric) => {
                const active = metric.key === selected.key;
                return (
                  <TouchableOpacity key={metric.key} onPress={() => setSelected(metric)} style={[styles.metricTile, active && { backgroundColor: metric.color, borderColor: metric.color }]}>
                    <Ionicons color={active ? colors.surface : metric.color} name={metric.icon} size={18} />
                    <Text style={[styles.metricText, active && { color: colors.surface }]}>{metric.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.chartCard}>
              <HistoryChart days={days} heightCm={heightCm} metric={selected} profileWeightKg={profileWeightKg} />
            </View>

            <View style={styles.daysList}>
              <Text style={typography.section}>Daily records</Text>
              {days.slice().reverse().map((day) => (
                <View key={day.date} style={styles.dayRow}>
                  <View>
                    <Text style={styles.dayDate}>{new Date(day.date).toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" })}</Text>
                    <Text style={styles.dayMeta}>{day.food_entries.length} foods - {day.supplements_taken.length} supplements</Text>
                  </View>
                  <Text style={styles.dayValue}>{formatValue(valueFor(day, selected.key, heightCm, profileWeightKg), selected.unit)}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

function mealForEntry(name: string) {
  const match = name.match(/\((Breakfast|Lunch|Dinner|Snack)\)$/);
  if (match) {
    return match[1];
  }
  return "Snack";
}

function HistoryChart({ days, heightCm, metric, profileWeightKg }: { days: DailyTracking[]; heightCm: number; metric: { key: MetricKey; label: string; unit: string; color: string }; profileWeightKg: number }) {
  const width = Math.min(Dimensions.get("window").width - spacing.md * 2 - spacing.md * 2, 520);
  const height = 210;
  const chartHeight = 148;
  const values = days.map((day) => valueFor(day, metric.key, heightCm, profileWeightKg));
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = days.length <= 1 ? width / 2 : 22 + (index * (width - 44)) / (days.length - 1);
    const y = 18 + (1 - value / max) * (chartHeight - 24);
    return { x, y, value, date: days[index].date };
  });
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>{metric.label} trend</Text>
        <Text style={styles.chartLatest}>{formatValue(values[values.length - 1] ?? 0, metric.unit)}</Text>
      </View>
      <Svg width={width} height={height}>
        <Line x1={18} y1={chartHeight + 14} x2={width - 18} y2={chartHeight + 14} stroke={colors.borderSoft} strokeWidth={1} />
        {points.map((point, index) => (
          <Rect key={`bar-${point.date}`} x={point.x - 7} y={point.y} width={14} height={chartHeight + 14 - point.y} rx={5} fill={metric.color} opacity={index === points.length - 1 ? 0.28 : 0.14} />
        ))}
        {points.length > 1 ? <Polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke={metric.color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /> : null}
        {points.map((point) => (
          <Circle key={`dot-${point.date}`} cx={point.x} cy={point.y} r={4.5} fill={colors.surface} stroke={metric.color} strokeWidth={2.5} />
        ))}
        {points.map((point) => (
          <SvgText key={`label-${point.date}`} x={point.x - 12} y={height - 10} fill={colors.muted} fontSize="10" fontWeight="700">
            {new Date(point.date).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3)}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

const styles = {
  summary: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.primaryDark,
    padding: spacing.lg,
  },
  summaryIcon: {
    width: 50,
    height: 50,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  summaryLabel: {
    color: colors.surfaceOnDark,
    fontSize: 12,
    fontWeight: "900" as const,
    textTransform: "uppercase" as const,
  },
  summaryValue: {
    color: colors.surface,
    fontSize: 28,
    fontWeight: "900" as const,
    marginTop: 3,
  },
  summarySubtext: {
    color: colors.surfaceOnDark,
    fontSize: 12,
    fontWeight: "700" as const,
    marginTop: 3,
  },
  metricGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: spacing.xs,
  },
  metricTile: {
    minHeight: 42,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
  },
  metricText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900" as const,
  },
  chartCard: {
    ...cards.default,
    padding: spacing.md,
  },
  diaryCard: {
    ...cards.default,
    gap: spacing.sm,
    padding: spacing.md,
  },
  mealHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginTop: spacing.xs,
  },
  mealTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "900" as const,
  },
  mealMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800" as const,
  },
  chartHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    gap: spacing.sm,
  },
  chartTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900" as const,
  },
  chartLatest: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "900" as const,
  },
  daysList: {
    ...cards.default,
    gap: spacing.sm,
    padding: spacing.md,
  },
  dayRow: {
    minHeight: 56,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm,
  },
  dayDate: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900" as const,
  },
  dayMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700" as const,
    marginTop: 2,
  },
  dayValue: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900" as const,
  },
};
