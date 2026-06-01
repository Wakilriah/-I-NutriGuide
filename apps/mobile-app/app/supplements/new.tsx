"use client";

import { Ionicons } from "@expo/vector-icons";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, ImageBackground, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MobileAppShell } from "../../src/components/MobileAppShell";
import { AppButton, AppTopBar, Badge, ErrorState, PageHeader, SearchInput } from "../../src/components/ui";
import { createUserSupplement, listSupplementsPage, type Supplement } from "../../src/features/supplements/api";
import { cards, colors, images, radii, spacing, typography } from "../../src/theme/design";

type SelectedSupplement = {
  supplement: Supplement;
  doseAmount: number;
  doseUnit: string;
  frequency: string;
  timingPeriods: string[];
  timings: string[];
};

const doseUnits = ["mg", "g", "mcg", "IU"];
const frequencyOptions = [
  { label: "One day", value: "daily" },
  { label: "Twice a day", value: "twice daily" },
  { label: "Weekly", value: "weekly" },
  { label: "As needed", value: "as needed" },
];
const timingOptions = [
  { label: "Morning", value: "morning", time: "08:00", icon: "sunny-outline" as const },
  { label: "Lunch", value: "lunch", time: "12:00", icon: "restaurant-outline" as const },
  { label: "Evening", value: "evening", time: "19:00", icon: "partly-sunny-outline" as const },
  { label: "Bedtime", value: "bedtime", time: "21:00", icon: "moon-outline" as const },
];
const defaultTimingPeriods = ["morning", "bedtime"];
const defaultTimings = ["08:00", "21:00"];

function parseCommonDose(value: string) {
  const match = value.match(/(\d+(?:\.\d+)?)\s*(mcg|mg|g|iu)?/i);
  const unit = match?.[2]?.toLowerCase();
  return {
    amount: match ? Number(match[1]) : 1,
    unit: unit === "iu" ? "IU" : unit || "mg",
  };
}

function formatDose(entry: SelectedSupplement) {
  return `${entry.doseAmount} ${entry.doseUnit}`;
}

function formatTimeInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function isValidReminderTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function reminderCountForFrequency(frequency: string) {
  return frequency === "twice daily" ? 2 : 1;
}

function nextTimingsForFrequency(frequency: string, currentTimings: string[]) {
  const count = reminderCountForFrequency(frequency);
  return Array.from({ length: count }, (_, index) => currentTimings[index] || defaultTimings[index]);
}

function nextTimingPeriodsForFrequency(frequency: string, currentPeriods: string[]) {
  const count = reminderCountForFrequency(frequency);
  return Array.from({ length: count }, (_, index) => currentPeriods[index] || defaultTimingPeriods[index]);
}

function getTimingLabel(value: string) {
  return timingOptions.find((option) => option.value === value)?.label ?? "Reminder";
}

function getTimingIcon(value: string) {
  return timingOptions.find((option) => option.value === value)?.icon ?? "time-outline";
}

function getTimingDefaultTime(value: string) {
  return timingOptions.find((option) => option.value === value)?.time ?? defaultTimings[0];
}

export default function AddSupplementScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<number, SelectedSupplement>>({});
  const [status, setStatus] = useState("");

  const catalog = useInfiniteQuery({
    initialPageParam: 1,
    queryKey: ["supplements", "infinite", search.trim()],
    queryFn: ({ pageParam }) => listSupplementsPage({ page: pageParam, search: search.trim() }),
    getNextPageParam: (lastPage, allPages) => (lastPage.next ? allPages.length + 1 : undefined),
  });
  const supplements = catalog.data?.pages.flatMap((page) => page.results) ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.values(selected);
      for (const entry of entries) {
        for (const timing of entry.timings) {
          await createUserSupplement({
            supplement_id: entry.supplement.id,
            dose: formatDose(entry),
            frequency: entry.frequency,
            time_of_day: timing,
            active: true,
          });
        }
      }
    },
    onError: () => setStatus("Unable to save supplements. Check dose and timing fields."),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user-supplements"] });
      router.replace("/tabs/supplements" as never);
    },
  });

  const toggle = (supplement: Supplement) => {
    setSelected((current) => {
      const existing = current[supplement.id];
      if (existing) {
        return current;
      }
      const dose = parseCommonDose(supplement.common_dose);
      return {
        ...current,
        [supplement.id]: {
          supplement,
          doseAmount: dose.amount,
          doseUnit: dose.unit,
          frequency: "daily",
          timingPeriods: [defaultTimingPeriods[0]],
          timings: [defaultTimings[0]],
        },
      };
    });
  };

  const updateSelected = (id: number, field: keyof Omit<SelectedSupplement, "supplement">, value: string | number) => {
    setSelected((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [field]: value,
        ...(field === "frequency"
          ? {
              timingPeriods: nextTimingPeriodsForFrequency(String(value), current[id].timingPeriods),
              timings: nextTimingsForFrequency(String(value), current[id].timings),
            }
          : {}),
      },
    }));
  };

  const removeSupplement = (id: number) => {
    setSelected((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const updateTiming = (id: number, index: number, value: string) => {
    setSelected((current) => {
      const entry = current[id];
      if (!entry) {
        return current;
      }
      const timings = entry.timings.map((timing, timingIndex) => (timingIndex === index ? formatTimeInput(value) : timing));
      return {
        ...current,
        [id]: { ...entry, timings },
      };
    });
  };

  const updateTimingPeriod = (id: number, index: number, value: string) => {
    setSelected((current) => {
      const entry = current[id];
      if (!entry) {
        return current;
      }
      return {
        ...current,
        [id]: {
          ...entry,
          timingPeriods: entry.timingPeriods.map((period, periodIndex) => (periodIndex === index ? value : period)),
          timings: entry.timings.map((timing, timingIndex) => (timingIndex === index ? getTimingDefaultTime(value) : timing)),
        },
      };
    });
  };

  const selectedTimingCount = Object.values(selected).reduce((sum, entry) => sum + entry.timings.length, 0);
  const canSave = Object.values(selected).length > 0 && Object.values(selected).every((entry) => entry.doseAmount > 0 && entry.timings.length > 0 && entry.timings.every(isValidReminderTime));

  return (
    <MobileAppShell>
      <AppTopBar title="Add New Supplement" />
      <FlatList
        data={supplements}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, padding: spacing.lg }}>
            <ImageBackground imageStyle={{ borderRadius: radii.xl }} source={{ uri: images.greens }} style={styles.heroImage}>
              <View style={styles.heroOverlay}>
                <Text style={styles.heroKicker}>Personalize your routine</Text>
                <Text style={styles.heroTitle}>Supplement Details</Text>
              </View>
            </ImageBackground>
            <PageHeader eyebrow="Supplement setup" title="Choose supplements" subtitle="Choose frequency, time of day, and exact reminder time." />
            <SearchInput onChangeText={setSearch} placeholder="Search supplement catalog" value={search} />

            {Object.values(selected).length ? (
              <View style={styles.selectedPanel}>
                <View style={styles.panelHeader}>
                  <Text style={typography.section}>Selected</Text>
                  <Badge label={`${selectedTimingCount} timing${selectedTimingCount === 1 ? "" : "s"}`} tone="green" />
                </View>
                {Object.values(selected).map((entry) => (
                  <View key={entry.supplement.id} style={styles.selectedCard}>
                    <View style={styles.selectedTitleRow}>
                      <Text style={styles.itemTitle}>{entry.supplement.name}</Text>
                      <TouchableOpacity onPress={() => removeSupplement(entry.supplement.id)} style={styles.removeButton}>
                        <Ionicons color={colors.danger} name="close" size={18} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.optionBlock}>
                      <Text style={styles.fieldLabel}>Dose</Text>
                      <View style={styles.doseRow}>
                        <TouchableOpacity onPress={() => updateSelected(entry.supplement.id, "doseAmount", Math.max(1, entry.doseAmount - 1))} style={styles.stepperButton}>
                          <Ionicons color={colors.primary} name="remove" size={18} />
                        </TouchableOpacity>
                        <Text style={styles.doseValue}>{entry.doseAmount}</Text>
                        <TouchableOpacity onPress={() => updateSelected(entry.supplement.id, "doseAmount", entry.doseAmount + 1)} style={styles.stepperButton}>
                          <Ionicons color={colors.primary} name="add" size={18} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.optionRow}>
                        {doseUnits.map((unit) => (
                          <OptionPill key={unit} active={entry.doseUnit === unit} label={unit} onPress={() => updateSelected(entry.supplement.id, "doseUnit", unit)} />
                        ))}
                      </View>
                    </View>
                    <View style={styles.optionBlock}>
                      <Text style={styles.fieldLabel}>Frequency</Text>
                      <View style={styles.optionRow}>
                        {frequencyOptions.map((option) => (
                          <OptionPill key={option.value} active={entry.frequency === option.value} label={option.label} onPress={() => updateSelected(entry.supplement.id, "frequency", option.value)} />
                        ))}
                      </View>
                    </View>
                    <View style={styles.optionBlock}>
                      <Text style={styles.fieldLabel}>Notification time</Text>
                      <View style={{ gap: spacing.xs }}>
                        {entry.timings.map((timing, index) => {
                          const period = entry.timingPeriods[index] ?? defaultTimingPeriods[index] ?? defaultTimingPeriods[0];
                          const label = getTimingLabel(period);
                          return (
                            <View key={`${entry.supplement.id}-${index}`} style={styles.timingSlot}>
                              <Text style={styles.timingSlotLabel}>{entry.frequency === "twice daily" ? `Reminder ${index + 1}` : "Reminder"}</Text>
                              <View style={styles.optionRow}>
                                {timingOptions.map((option) => (
                                  <OptionPill key={option.value} active={period === option.value} label={option.label} onPress={() => updateTimingPeriod(entry.supplement.id, index, option.value)} />
                                ))}
                              </View>
                              <View style={styles.timeInputRow}>
                                <View style={styles.timeInputLabel}>
                                  <Ionicons color={colors.primary} name={getTimingIcon(period)} size={18} />
                                  <Text style={styles.timeInputText}>{label}</Text>
                                </View>
                                <TextInput
                                  accessibilityLabel={`${entry.supplement.name} ${label} exact notification time`}
                                  keyboardType="numbers-and-punctuation"
                                  maxLength={5}
                                  onChangeText={(value) => updateTiming(entry.supplement.id, index, value)}
                                  placeholder={getTimingDefaultTime(period)}
                                  placeholderTextColor={colors.placeholder}
                                  style={[styles.timeInput, timing && !isValidReminderTime(timing) && styles.timeInputInvalid]}
                                  value={timing}
                                />
                              </View>
                            </View>
                          );
                        })}
                      </View>
                      {entry.timings.some((timing) => timing && !isValidReminderTime(timing)) ? <Text style={styles.errorText}>Use 24-hour time, for example 08:30.</Text> : null}
                    </View>
                  </View>
                ))}
                {status ? <Text style={styles.errorText}>{status}</Text> : null}
                <AppButton disabled={!canSave || saveMutation.isPending} icon="checkmark-circle" label={saveMutation.isPending ? "Saving..." : "Save selected supplements"} onPress={() => saveMutation.mutate()} />
              </View>
            ) : null}

            <Text style={typography.section}>Catalog</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={{ padding: spacing.md }}>
            {catalog.isLoading ? <ActivityIndicator color={colors.primary} /> : <Text style={typography.body}>No supplements found.</Text>}
          </View>
        }
        ListFooterComponent={
          <View style={{ minHeight: 120, gap: spacing.md, padding: spacing.lg }}>
            {catalog.isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : null}
            {catalog.isError ? <ErrorState message="Unable to load supplement catalog." /> : null}
            <View style={styles.proTip}>
              <Ionicons color={colors.surface} name="information-circle-outline" size={22} />
              <View style={{ flex: 1 }}>
                <Text style={styles.proTipTitle}>Pro Tip</Text>
                <Text style={styles.proTipText}>Taking supplements at the same time every day helps build a lasting routine. Some nutrients are best reviewed with meal timing.</Text>
              </View>
            </View>
            <View style={styles.statsCard}>
              <Text style={styles.statsKicker}>Quick stats</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
                <Text style={styles.statsLabel}>Current stack</Text>
                <Text style={styles.statsValue}>{Object.values(selected).length} items</Text>
              </View>
              <View style={styles.statsTrack}>
                <View style={[styles.statsFill, { width: `${Math.min(Object.values(selected).length / 5, 1) * 100}%` }]} />
              </View>
              <Text style={styles.statsNote}>Choose the supplements you currently take, then save with timing details.</Text>
            </View>
          </View>
        }
        onEndReached={() => {
          if (catalog.hasNextPage && !catalog.isFetchingNextPage) {
            catalog.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => {
          const active = Boolean(selected[item.id]);
          const timingCount = selected[item.id]?.timings.length ?? 0;
          return (
            <TouchableOpacity onPress={() => toggle(item)} style={[styles.catalogRow, active && styles.catalogRowActive]}>
              <View style={[styles.catalogIcon, active && { backgroundColor: colors.primary }]}>
                <Ionicons color={active ? colors.surface : colors.primary} name={active ? "checkmark" : "nutrition"} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemMeta}>{active ? `${timingCount} reminder${timingCount === 1 ? "" : "s"} selected` : item.common_dose || "Dose not listed"}</Text>
              </View>
              <Ionicons color={active ? colors.primary : colors.mutedSoft} name={active ? "checkmark-circle" : "add-circle-outline"} size={22} />
            </TouchableOpacity>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </MobileAppShell>
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
  selectedPanel: {
    ...cards.default,
    gap: spacing.md,
    padding: spacing.md,
  },
  panelHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  selectedCard: {
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm,
  },
  selectedTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: spacing.sm,
  },
  optionBlock: {
    gap: spacing.xs,
  },
  fieldLabel: {
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
    backgroundColor: colors.surface,
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
  timingSlot: {
    gap: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.sm,
  },
  timeInputRow: {
    minHeight: 54,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  timeInputLabel: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 7,
  },
  timeInput: {
    width: 94,
    minHeight: 40,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 18,
    fontWeight: "900" as const,
    paddingHorizontal: spacing.sm,
    textAlign: "center" as const,
  },
  timeInputInvalid: {
    borderColor: colors.danger,
  },
  timingSlotLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900" as const,
    textTransform: "uppercase" as const,
  },
  timeInputText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900" as const,
  },
  addTimingButton: {
    minHeight: 38,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
  },
  addTimingText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900" as const,
  },
  removeTimingButton: {
    minHeight: 30,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    alignSelf: "flex-start" as const,
  },
  removeTimingText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "900" as const,
  },
  optionPill: {
    minHeight: 36,
    justifyContent: "center" as const,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
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
  removeButton: {
    width: 34,
    height: 34,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  catalogRow: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    minHeight: 74,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  heroImage: {
    height: 170,
    justifyContent: "flex-end" as const,
    overflow: "hidden" as const,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceContainerHigh,
  },
  heroOverlay: {
    padding: spacing.lg,
    backgroundColor: "rgba(18,29,38,0.34)",
  },
  heroKicker: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "900" as const,
    letterSpacing: 1.4,
    textTransform: "uppercase" as const,
  },
  heroTitle: {
    color: colors.surface,
    fontSize: 25,
    fontWeight: "900" as const,
    marginTop: 3,
  },
  proTip: {
    flexDirection: "row" as const,
    gap: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.primary,
    padding: spacing.lg,
  },
  proTipTitle: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: "900" as const,
    marginBottom: 6,
  },
  proTipText: {
    color: colors.surfaceOnDark,
    fontSize: 14,
    lineHeight: 21,
  },
  statsCard: {
    ...cards.default,
    gap: spacing.sm,
    borderRadius: radii.xl,
  },
  statsKicker: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900" as const,
    letterSpacing: 1.4,
    textTransform: "uppercase" as const,
  },
  statsLabel: {
    color: colors.text,
    fontSize: 14,
  },
  statsValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900" as const,
  },
  statsTrack: {
    height: 8,
    overflow: "hidden" as const,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
  },
  statsFill: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  statsNote: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  catalogRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  catalogIcon: {
    width: 42,
    height: 42,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900" as const,
  },
  itemMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700" as const,
    marginTop: 3,
  },
  errorText: {
    color: colors.danger,
    fontWeight: "800" as const,
  },
};
