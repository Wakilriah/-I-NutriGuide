import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme/design";

type MetricSliderProps = {
  error?: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  maximum: number;
  minimum: number;
  onChange: (value: string) => void;
  step?: number;
  suffix: string;
  value: string;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function decimalsForStep(step: number) {
  const [, decimal = ""] = String(step).split(".");
  return decimal.length;
}

export function MetricSlider({ error, icon, label, maximum, minimum, onChange, step = 1, suffix, value }: MetricSliderProps) {
  const [width, setWidth] = useState(1);
  const widthRef = useRef(1);
  const parsedValue = Number(value);
  const displayValue = Number.isFinite(parsedValue) ? parsedValue : minimum;
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const dragStartProgress = useRef(0);
  const lastValue = useRef(displayValue);
  const decimals = decimalsForStep(step);
  const range = maximum - minimum;

  const ticks = useMemo(() => Array.from({ length: 17 }, (_, index) => index), []);

  const valueToProgress = (nextValue: number) => (clamp(nextValue, minimum, maximum) - minimum) / range;
  const progressToValue = (progress: number) => {
    const raw = minimum + clamp(progress, 0, 1) * range;
    const stepped = Math.round(raw / step) * step;
    return clamp(Number(stepped.toFixed(decimals)), minimum, maximum);
  };

  useEffect(() => {
    const progress = valueToProgress(displayValue);
    Animated.spring(animatedProgress, {
      toValue: progress,
      damping: 18,
      mass: 0.7,
      stiffness: 160,
      useNativeDriver: false,
    }).start();
    lastValue.current = displayValue;
  }, [displayValue, maximum, minimum]);

  const setFromProgress = (progress: number) => {
    const nextValue = progressToValue(progress);
    animatedProgress.setValue(valueToProgress(nextValue));
    if (nextValue !== lastValue.current) {
      lastValue.current = nextValue;
      onChange(nextValue.toFixed(decimals));
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 4,
      onPanResponderGrant: () => {
        dragStartProgress.current = valueToProgress(lastValue.current);
      },
      onPanResponderMove: (_, gesture) => {
        setFromProgress(dragStartProgress.current + gesture.dx / Math.max(widthRef.current, 1));
      },
      onPanResponderRelease: () => {
        Animated.sequence([
          Animated.spring(animatedProgress, {
            toValue: valueToProgress(lastValue.current),
            damping: 12,
            mass: 0.6,
            stiffness: 210,
            useNativeDriver: false,
          }),
        ]).start();
      },
    }),
  ).current;

  const fillWidth = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const thumbLeft = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(width - 34, 1)],
  });

  return (
    <View style={[styles.card, error && styles.cardError]}>
      <View style={styles.header}>
        <View style={styles.iconShell}>
          <Ionicons color={colors.primary} name={icon} size={19} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.range}>{minimum} - {maximum} {suffix}</Text>
        </View>
        <Animated.View style={styles.valuePill}>
          <Text style={styles.value}>{displayValue.toFixed(decimals)}</Text>
          <Text style={styles.suffix}>{suffix}</Text>
        </Animated.View>
      </View>

      <View
        {...panResponder.panHandlers}
        onLayout={(event) => {
          widthRef.current = event.nativeEvent.layout.width;
          setWidth(event.nativeEvent.layout.width);
        }}
        style={styles.trackWrap}
      >
        <View style={styles.track}>
          <Animated.View style={[styles.trackFill, { width: fillWidth }]} />
          <View style={styles.tickRow}>
            {ticks.map((tick) => (
              <View key={tick} style={[styles.tick, tick % 4 === 0 && styles.majorTick]} />
            ))}
          </View>
        </View>
        <Animated.View style={[styles.thumb, { transform: [{ translateX: thumbLeft }] }]}>
          <Ionicons color={colors.surface} name="resize" size={16} />
        </Animated.View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = {
  card: {
    gap: spacing.md,
    borderColor: colors.borderSoft,
    borderRadius: radii.xl,
    borderWidth: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  cardError: {
    borderColor: colors.danger,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
  },
  iconShell: {
    width: 38,
    height: 38,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900" as const,
  },
  range: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800" as const,
    marginTop: 2,
  },
  valuePill: {
    minWidth: 78,
    minHeight: 46,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
  },
  value: {
    color: colors.surface,
    fontSize: 19,
    fontWeight: "900" as const,
  },
  suffix: {
    color: colors.surfaceOnDark,
    fontSize: 10,
    fontWeight: "900" as const,
    textTransform: "uppercase" as const,
  },
  trackWrap: {
    height: 54,
    justifyContent: "center" as const,
  },
  track: {
    height: 18,
    justifyContent: "center" as const,
    overflow: "hidden" as const,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerLow,
  },
  trackFill: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    top: 0,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  tickRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 8,
  },
  tick: {
    width: 1,
    height: 7,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.64)",
  },
  majorTick: {
    height: 12,
    backgroundColor: colors.surface,
  },
  thumb: {
    position: "absolute" as const,
    left: 0,
    width: 34,
    height: 34,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.pill,
    backgroundColor: colors.secondaryContainer,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "800" as const,
  },
};
