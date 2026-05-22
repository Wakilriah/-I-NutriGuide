import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { ActivityIndicator, Animated, Image, ImageBackground, Text, TextInput, TouchableOpacity, View, type DimensionValue, type ImageSourcePropType, type TextInputProps, type ViewStyle } from "react-native";
import { cards, colors, iconSizes, images, radii, spacing, typography } from "../theme/design";

type IconName = ComponentProps<typeof Ionicons>["name"];

export function AnimatedSection({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { delay, duration: 320, toValue: 1, useNativeDriver: true }),
      Animated.timing(translateY, { delay, duration: 320, toValue: 0, useNativeDriver: true }),
    ]).start();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

export function FadeInSection({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { delay, duration: 320, toValue: 1, useNativeDriver: true }).start();
  }, [delay, opacity]);

  return (
    <Animated.View style={[style, { opacity }]}>
      {children}
    </Animated.View>
  );
}

export function AppTopBar({ onAvatarPress, subtitle, title = "I-NutriGuide" }: { onAvatarPress?: () => void; subtitle?: string; title?: string }) {
  return (
    <View
      style={{
        minHeight: 78,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomColor: "rgba(191,202,186,0.46)",
        borderBottomWidth: 1,
        backgroundColor: "rgba(239,253,237,0.94)",
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <TouchableOpacity
          accessibilityLabel="Profile avatar"
          accessibilityRole="button"
          disabled={!onAvatarPress}
          onPress={onAvatarPress}
          style={{
            width: 44,
            height: 44,
            borderColor: colors.primaryFresh,
            borderRadius: radii.pill,
            borderWidth: 2,
            overflow: "hidden",
          }}
        >
          <Image source={{ uri: images.avatarWoman }} style={{ width: "100%", height: "100%" }} />
        </TouchableOpacity>
        <View>
          <Text style={{ color: colors.primary, fontSize: 26, fontWeight: "900", lineHeight: 31 }}>{title}</Text>
          {subtitle ? <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800", marginTop: 1 }}>{subtitle}</Text> : null}
        </View>
      </View>
      <TouchableOpacity
        accessibilityLabel="Notifications"
        style={{
          width: 42,
          height: 42,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.pill,
          backgroundColor: "rgba(255,255,255,0.44)",
        }}
      >
        <Ionicons color={colors.primary} name="notifications-outline" size={iconSizes.lg} />
      </TouchableOpacity>
    </View>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      {eyebrow ? <Text style={{ color: colors.secondary, fontSize: 13, fontWeight: "900", letterSpacing: 0.4, textTransform: "uppercase" }}>{eyebrow}</Text> : null}
      <Text style={typography.title}>{title}</Text>
      {subtitle ? <Text style={typography.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function AppButton({
  accessibilityLabel,
  disabled,
  icon,
  label,
  onPress,
  variant = "primary",
}: {
  accessibilityLabel?: string;
  disabled?: boolean;
  icon?: IconName;
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styleByVariant = {
    primary: { backgroundColor: colors.primary, borderColor: colors.primary },
    secondary: { backgroundColor: "rgba(255,255,255,0.62)", borderColor: colors.primary },
    ghost: { backgroundColor: colors.surfaceContainerLow, borderColor: colors.borderSoft },
    danger: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft },
  }[variant];
  const textColor = variant === "primary" ? colors.surface : variant === "danger" ? colors.danger : colors.primary;

  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 58,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        borderRadius: radii.lg,
        borderWidth: 1,
        opacity: disabled ? 0.7 : 1,
        paddingHorizontal: spacing.md,
        ...styleByVariant,
        shadowColor: variant === "primary" ? colors.primaryContainer : "transparent",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: variant === "primary" ? 0.18 : 0,
        shadowRadius: 18,
        elevation: variant === "primary" ? 3 : 0,
      }}
    >
      {icon ? <Ionicons color={textColor} name={icon} size={18} /> : null}
      <Text style={{ color: textColor, fontWeight: "900" }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function AppCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View
      style={{ ...cards.default, ...style }}
    >
      {children}
    </View>
  );
}

export function AppInput({
  error,
  label,
  ...props
}: TextInputProps & {
  error?: string;
  label: string;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={typography.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.placeholder}
        style={{
          minHeight: 56,
          borderColor: error ? colors.danger : "transparent",
          borderRadius: radii.lg,
          borderWidth: 1,
          backgroundColor: colors.surfaceContainerLow,
          color: colors.text,
          paddingHorizontal: spacing.md,
          fontSize: 16,
          fontWeight: "700",
        }}
        {...props}
      />
      {error ? <Text style={{ color: colors.danger, fontWeight: "800" }}>{error}</Text> : null}
    </View>
  );
}

export function OptionSelect({
  error,
  label,
  onSelect,
  options,
  selected,
}: {
  error?: string;
  label: string;
  onSelect: (value: string) => void;
  options: Array<{ icon?: IconName; label: string; value: string }>;
  selected?: string;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={typography.label}>{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
        {options.map((option) => {
          const active = selected === option.value;
          return (
            <TouchableOpacity
              accessibilityLabel={`${label}: ${option.label}`}
              accessibilityRole="button"
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={{
                minHeight: 46,
                minWidth: 110,
                flexGrow: 1,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 7,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: active ? colors.primary : error ? colors.danger : colors.border,
                backgroundColor: active ? colors.primarySoft : colors.surfaceContainerLow,
                paddingHorizontal: spacing.sm,
              }}
            >
              {option.icon ? <Ionicons color={active ? colors.primary : colors.muted} name={option.icon} size={iconSizes.sm} /> : null}
              <Text style={{ color: active ? colors.primary : colors.muted, fontSize: 13, fontWeight: "900", textAlign: "center" }}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error ? <Text style={{ color: colors.danger, fontWeight: "800" }}>{error}</Text> : null}
    </View>
  );
}

export function Badge({ label, tone = "green" }: { label: string; tone?: "green" | "orange" | "red" | "neutral" }) {
  const palette = {
    green: { backgroundColor: colors.primarySoft, color: colors.primary },
    orange: { backgroundColor: colors.secondaryContainer, color: colors.surface },
    red: { backgroundColor: colors.dangerSoft, color: colors.danger },
    neutral: { backgroundColor: colors.surfaceContainerHigh, color: colors.muted },
  }[tone];
  return (
    <View style={{ alignSelf: "flex-start", borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: palette.backgroundColor }}>
      <Text style={{ color: palette.color, fontSize: 12, fontWeight: "900" }}>{label}</Text>
    </View>
  );
}

export function SearchInput({ placeholder = "Search foods, supplements, nutrients", value, onChangeText }: Pick<TextInputProps, "placeholder" | "value" | "onChangeText">) {
  return (
    <View
      style={{
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        borderRadius: radii.lg,
        backgroundColor: colors.surfaceContainer,
        paddingHorizontal: spacing.md,
      }}
    >
      <Ionicons color={colors.mutedSoft} name="search" size={iconSizes.md} />
      <TextInput
        accessibilityLabel="Search"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: "700" }}
        value={value}
      />
    </View>
  );
}

export function FilterChip({ active, icon, label, onPress }: { active?: boolean; icon?: IconName; label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        minHeight: 38,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primaryContainer : "rgba(255,255,255,0.72)",
        paddingHorizontal: 13,
      }}
    >
      {icon ? <Ionicons color={active ? colors.surface : colors.primary} name={icon} size={iconSizes.sm} /> : null}
      <Text style={{ color: active ? colors.surface : colors.muted, fontSize: 13, fontWeight: "900" }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SectionHeader({ action, title }: { action?: ReactNode; title: string }) {
  return (
    <View style={{ minHeight: 32, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
      <Text style={typography.section}>{title}</Text>
      {action}
    </View>
  );
}

export function EmptyState({ icon = "leaf", message, title }: { icon?: IconName; message: string; title: string }) {
  return (
    <AppCard style={{ alignItems: "center", gap: spacing.sm, padding: spacing.lg }}>
      <View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: radii.pill, backgroundColor: colors.primarySoft }}>
        <Ionicons color={colors.primary} name={icon} size={iconSizes.lg} />
      </View>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900", textAlign: "center" }}>{title}</Text>
      <Text style={{ color: colors.muted, lineHeight: 22, textAlign: "center" }}>{message}</Text>
    </AppCard>
  );
}

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <AppCard style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <ActivityIndicator color={colors.primary} />
        <Text style={{ color: colors.muted, fontWeight: "800" }}>{message}</Text>
      </View>
      <SkeletonBlock width="72%" />
      <SkeletonBlock width="48%" />
    </AppCard>
  );
}

export function SkeletonBlock({ height = 14, width = "100%" }: { height?: number; width?: DimensionValue }) {
  return (
    <View
      style={{
        width,
        height,
        borderRadius: radii.pill,
        backgroundColor: colors.border,
        opacity: 0.78,
      }}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <AppCard style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <View style={{ width: 42, height: 42, borderRadius: radii.md, backgroundColor: colors.border, opacity: 0.78 }} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <SkeletonBlock height={16} width="70%" />
          <SkeletonBlock width="42%" />
        </View>
      </View>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBlock key={index} width={index === lines - 1 ? "56%" : "100%"} />
      ))}
    </AppCard>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <View style={{ borderRadius: radii.md, backgroundColor: colors.dangerSoft, padding: spacing.md }}>
      <Text style={{ color: colors.danger, fontWeight: "800" }}>{message}</Text>
    </View>
  );
}

export function ProgressSteps({ current, total }: { current: number; total: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={{
            flex: 1,
            height: 7,
            borderRadius: radii.pill,
            backgroundColor: index < current ? colors.primary : colors.border,
          }}
        />
      ))}
    </View>
  );
}

export function FoodCard({
  category,
  image = { uri: images.bowlClose },
  name,
  nutrients,
  reason,
  score,
}: {
  category?: string;
  image?: ImageSourcePropType;
  name: string;
  nutrients?: string[];
  reason?: string;
  score?: number;
}) {
  return (
    <AppCard style={{ ...cards.cream, gap: spacing.md, padding: spacing.sm }}>
      <ImageBackground imageStyle={{ borderRadius: radii.xl }} source={image} style={{ height: 164, justifyContent: "flex-start", alignItems: "flex-end", overflow: "hidden", borderRadius: radii.xl }}>
        <View style={{ padding: spacing.sm }}>
          {typeof score === "number" ? <Badge label={score >= 0.8 ? "High Match" : `${Math.round(score * 100)}% match`} tone="orange" /> : null}
        </View>
      </ImageBackground>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.sm }}>
        <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.primarySoft }}>
          <Ionicons color={colors.primary} name="restaurant" size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }}>{name}</Text>
          {category ? <Text style={{ color: colors.muted, marginTop: 2 }}>{category}</Text> : null}
        </View>
      </View>
      {reason ? (
        <View style={{ flexDirection: "row", gap: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surfaceContainerLow, padding: spacing.md }}>
          <Ionicons color={colors.primary} name="bulb-outline" size={iconSizes.md} />
          <Text style={{ flex: 1, color: colors.text, lineHeight: 22 }}>{reason}</Text>
        </View>
      ) : null}
      {nutrients?.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: spacing.sm, paddingBottom: spacing.xs }}>
          {nutrients.slice(0, 3).map((tag) => (
            <Badge key={tag} label={tag} tone="neutral" />
          ))}
        </View>
      ) : null}
    </AppCard>
  );
}

export function SupplementCard({
  active = true,
  dose,
  frequency,
  name,
  timeOfDay,
}: {
  active?: boolean;
  dose?: string;
  frequency?: string;
  name: string;
  timeOfDay?: string;
}) {
  return (
    <AppCard style={{ ...cards.cream, gap: spacing.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <View style={{ width: 54, height: 54, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: active ? colors.secondaryContainer : colors.surfaceContainerHigh }}>
          <Ionicons color={active ? colors.surface : colors.muted} name="nutrition" size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>{name}</Text>
          <Text style={{ color: colors.muted, marginTop: 2 }}>{[dose, frequency, timeOfDay].filter(Boolean).join(" - ")}</Text>
        </View>
        <View
          style={{
            width: 42,
            height: 42,
            alignItems: "center",
            justifyContent: "center",
            borderColor: active ? colors.primary : colors.border,
            borderRadius: radii.pill,
            borderWidth: 1,
            backgroundColor: active ? colors.primary : "transparent",
          }}
        >
          <Ionicons color={active ? colors.surface : colors.mutedSoft} name={active ? "checkmark-circle" : "pause-circle"} size={iconSizes.md} />
        </View>
      </View>
    </AppCard>
  );
}

export function RecommendationCard({
  category,
  explanation,
  foodName,
  nutrients,
  score,
  supplementName,
  warnings,
}: {
  category?: string;
  explanation: string;
  foodName: string;
  nutrients?: string[];
  score: number;
  supplementName?: string;
  warnings?: string[];
}) {
  return (
    <AppCard style={{ ...cards.cream, gap: spacing.md, padding: spacing.sm }}>
      <ImageBackground imageStyle={{ borderRadius: radii.xl }} source={{ uri: images.avocado }} style={{ height: 172, alignItems: "flex-end", justifyContent: "flex-start", overflow: "hidden", borderRadius: radii.xl }}>
        <View style={{ padding: spacing.sm }}>
          <Badge label={score >= 0.82 ? "Best Pair" : "Absorption Boost"} tone="orange" />
        </View>
      </ImageBackground>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 19, fontWeight: "900" }}>{foodName}</Text>
          {category ? <Text style={{ color: colors.muted, marginTop: 2 }}>{category}</Text> : null}
        </View>
        <Badge label={`${Math.round(score * 100)}% match`} tone="green" />
      </View>
      {supplementName ? <Badge label={`With ${supplementName}`} tone="orange" /> : null}
      <View style={{ flexDirection: "row", gap: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surfaceContainerLow, padding: spacing.md }}>
        <Ionicons color={colors.primary} name="bulb-outline" size={iconSizes.md} />
        <Text style={{ flex: 1, color: colors.text, lineHeight: 22 }}>Helps absorption of {supplementName ?? "your supplement"}: {explanation}</Text>
      </View>
      {nutrients?.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {nutrients.map((tag) => (
            <Badge key={tag} label={tag} tone="neutral" />
          ))}
        </View>
      ) : null}
      {warnings?.map((warning) => <Badge key={warning} label={warning} tone="red" />)}
    </AppCard>
  );
}

export function StatCard({ icon, label, tone = "green", value }: { icon?: IconName; label: string; tone?: "green" | "orange" | "neutral"; value: string | number }) {
  const palette = {
    green: { backgroundColor: colors.primarySoft, color: colors.primary },
    orange: { backgroundColor: colors.secondarySoft, color: colors.secondary },
    neutral: { backgroundColor: colors.cream, color: colors.muted },
  }[tone];

  return (
    <AppCard style={{ flex: 1, minWidth: 140, gap: spacing.xs }}>
      <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: palette.backgroundColor }}>
        {icon ? <Ionicons color={palette.color} name={icon} size={iconSizes.md} /> : null}
      </View>
      <Text style={{ color: colors.muted, fontWeight: "800" }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 26, fontWeight: "900" }}>{value}</Text>
    </AppCard>
  );
}

export function NutrientCard({
  description,
  icon = "leaf",
  title,
  badge = "Nutrient Synergy",
}: {
  badge?: string;
  description: string;
  icon?: IconName;
  title: string;
}) {
  return (
    <AppCard style={{ ...cards.cream, gap: spacing.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.primarySoft }}>
          <Ionicons color={colors.primary} name={icon} size={iconSizes.lg} />
        </View>
        <View style={{ flex: 1 }}>
          <Badge label={badge} tone="orange" />
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900", marginTop: spacing.xs }}>{title}</Text>
        </View>
      </View>
      <Text style={typography.body}>{description}</Text>
    </AppCard>
  );
}

export function GoalSelector({
  options,
  selected,
  onSelect,
}: {
  options: Array<{ icon?: IconName; label: string; value: string }>;
  selected?: string;
  onSelect?: (value: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
      {options.map((option) => (
        <FilterChip
          active={selected === option.value}
          icon={option.icon}
          key={option.value}
          label={option.label}
          onPress={onSelect ? () => onSelect(option.value) : undefined}
        />
      ))}
    </View>
  );
}

export function AllergySelector({
  items,
  selected,
  onToggle,
}: {
  items: string[];
  selected: string[];
  onToggle?: (item: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
      {items.map((item) => (
        <FilterChip active={selected.includes(item)} icon="shield-checkmark" key={item} label={item} onPress={onToggle ? () => onToggle(item) : undefined} />
      ))}
    </View>
  );
}

export function RecommendationActions({
  onAvoid,
  onDislike,
  onLike,
  onSave,
}: {
  onAvoid?: () => void;
  onDislike?: () => void;
  onLike?: () => void;
  onSave?: () => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
      {onLike ? <FilterChip icon="heart" label="Like" onPress={onLike} /> : null}
      {onSave ? <FilterChip icon="bookmark" label="Save" onPress={onSave} /> : null}
      {onAvoid ? <FilterChip icon="remove-circle" label="Avoid" onPress={onAvoid} /> : null}
      {onDislike ? <FilterChip icon="close-circle" label="Not for me" onPress={onDislike} /> : null}
    </View>
  );
}

export function PremiumFeatureCard({
  badge = "Premium-ready",
  description,
  icon = "sparkles",
  title,
}: {
  badge?: string;
  description: string;
  icon?: IconName;
  title: string;
}) {
  return (
    <AppCard style={{ gap: spacing.sm, backgroundColor: colors.primary }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.secondarySoft }}>
          <Ionicons color={colors.secondary} name={icon} size={iconSizes.lg} />
        </View>
        <View style={{ flex: 1 }}>
          <Badge label={badge} tone="orange" />
          <Text style={{ color: colors.surface, fontSize: 18, fontWeight: "900", marginTop: spacing.xs }}>{title}</Text>
        </View>
      </View>
      <Text style={{ color: colors.surfaceOnDark, fontSize: 16, lineHeight: 24 }}>{description}</Text>
    </AppCard>
  );
}
