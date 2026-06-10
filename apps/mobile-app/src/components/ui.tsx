import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { ActivityIndicator, Animated, Image, ImageBackground, Modal, ScrollView, Text, TextInput, TouchableOpacity, View, type DimensionValue, type ImageSourcePropType, type TextInputProps, type ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { getProfile } from "../features/profile/api";
import { getNotificationUnreadCount } from "../features/notifications/api";
import type { FoodEntry } from "../features/tracking/api";
import { useAuthStore } from "../stores/auth-store";
import { cards, colors, iconSizes, images, radii, shadow, spacing, typography } from "../theme/design";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

export function AuthBackgroundScreen({
  children,
  contentStyle,
  justifyContent = "center",
}: {
  children: ReactNode;
  contentStyle?: ViewStyle;
  justifyContent?: ViewStyle["justifyContent"];
}) {
  const insets = useSafeAreaInsets();
  const verticalPadding = typeof contentStyle?.paddingVertical === "number" ? contentStyle.paddingVertical : spacing.xl;
  const bottomPadding = typeof contentStyle?.paddingBottom === "number" ? contentStyle.paddingBottom : verticalPadding;
  const topPadding = typeof contentStyle?.paddingTop === "number" ? contentStyle.paddingTop : verticalPadding;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ImageBackground resizeMode="cover" source={{ uri: images.welcomeBackground }} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,75,24,0.54)" }}>
          <ScrollView
            contentContainerStyle={[
              {
                flexGrow: 1,
                justifyContent,
                paddingHorizontal: spacing.md,
              },
              contentStyle,
              {
                paddingBottom: bottomPadding + insets.bottom,
                paddingTop: topPadding + insets.top,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </ImageBackground>
    </View>
  );
}

export function AuthGlassCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={{ ...cards.onboardingGlass, ...style }}>{children}</View>;
}

export function GenderAvatar({
  avatarUrl,
  gender,
  name,
  size = 40,
  style,
}: {
  avatarUrl?: string | null;
  gender?: string | null;
  name?: string | null;
  size?: number;
  style?: ViewStyle;
}) {
  const normalizedGender = (gender ?? "").toLowerCase();
  const imageUri = avatarUrl || (normalizedGender.includes("female") || normalizedGender.includes("woman") || normalizedGender.includes("girl") ? images.avatarWoman : normalizedGender.includes("male") || normalizedGender.includes("man") || normalizedGender.includes("boy") ? images.avatarMan : "");
  const initials = (name ?? "")
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
          borderColor: "rgba(255,255,255,0.72)",
          borderRadius: radii.pill,
          borderWidth: Math.max(1, Math.round(size * 0.04)),
          overflow: "hidden",
          backgroundColor: colors.primarySoft,
        },
        style,
      ]}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={{ width: "100%", height: "100%" }} />
      ) : initials ? (
        <Text style={{ color: colors.primary, fontSize: Math.max(13, Math.round(size * 0.36)), fontWeight: "900" }}>{initials}</Text>
      ) : (
        <Ionicons color={colors.primary} name="person" size={Math.round(size * 0.52)} />
      )}
    </View>
  );
}

export function AppTopBar({ onAvatarPress, onNotificationsPress, subtitle, title = "I-NutriGuide" }: { onAvatarPress?: () => void; onNotificationsPress?: () => void; subtitle?: string; title?: string }) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const profile = useQuery({ enabled: Boolean(user), queryKey: ["profile"], queryFn: getProfile, staleTime: 5 * 60 * 1000 });
  const unread = useQuery({
    enabled: Boolean(user),
    queryKey: ["notification-unread-count"],
    queryFn: getNotificationUnreadCount,
    refetchInterval: 60_000,
  });
  const unreadCount = unread.data?.count ?? 0;
  const profileExtras = profile.data as (typeof profile.data & { avatar_url?: string | null; name?: string | null }) | undefined;
  return (
    <View
      style={{
        minHeight: 64 + insets.top,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingTop: Math.max(insets.top, spacing.sm),
        paddingBottom: spacing.sm,
      }}
    >
      <TouchableOpacity
        accessibilityLabel="Open profile"
        accessibilityRole="button"
        activeOpacity={onAvatarPress ? 0.72 : 1}
        disabled={!onAvatarPress}
        hitSlop={{ bottom: 12, left: 12, right: 12, top: 12 }}
        onPress={onAvatarPress}
        style={{ minHeight: 48, flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm }}
      >
        <GenderAvatar avatarUrl={profileExtras?.avatar_url} gender={profile.data?.gender} name={profileExtras?.name ?? user?.name} size={40} />
        <View>
          <Text style={{ color: colors.surface, fontSize: 20, fontWeight: "900", lineHeight: 25 }}>{title}</Text>
          {subtitle ? <Text style={{ color: colors.surfaceOnDark, fontSize: 12, fontWeight: "800", marginTop: 1 }}>{subtitle}</Text> : null}
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityLabel="Notifications"
        onPress={onNotificationsPress ?? (() => router.push("/tabs/notifications" as never))}
        style={{
          width: 40,
          height: 40,
          alignItems: "center",
          justifyContent: "center",
          borderColor: colors.borderSoft,
          borderRadius: radii.pill,
          borderWidth: 0,
          backgroundColor: "rgba(255,255,255,0.12)",
        }}
      >
        <Ionicons color={colors.surface} name="notifications-outline" size={iconSizes.lg} />
        {unreadCount > 0 ? (
          <View
            style={{
              position: "absolute",
              right: -4,
              top: -5,
              minWidth: 20,
              height: 20,
              alignItems: "center",
              justifyContent: "center",
              borderColor: colors.primary,
              borderRadius: radii.pill,
              borderWidth: 2,
              backgroundColor: colors.danger,
              paddingHorizontal: 4,
            }}
          >
            <Text style={{ color: colors.surface, fontSize: 10, fontWeight: "900" }}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
          </View>
        ) : null}
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
      {eyebrow ? <Text style={{ color: colors.secondary, fontSize: 12, fontWeight: "900", letterSpacing: 0.4, textTransform: "uppercase" }}>{eyebrow}</Text> : null}
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
  variant?: "primary" | "secondary" | "ghost" | "danger" | "green";
}) {
  const styleByVariant = {
    primary: { backgroundColor: colors.secondaryContainer, borderColor: colors.secondaryContainer },
    secondary: { backgroundColor: "rgba(255,255,255,0.62)", borderColor: colors.primary },
    ghost: { backgroundColor: colors.surfaceContainerLow, borderColor: colors.borderSoft },
    danger: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft },
    green: { backgroundColor: colors.primary, borderColor: colors.primary },
  }[variant];
  const textColor = variant === "primary" ? colors.text : variant === "green" ? colors.surface : variant === "danger" ? colors.danger : colors.primary;

  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 50,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        borderRadius: radii.md,
        borderWidth: 1,
        opacity: disabled ? 0.7 : 1,
        paddingHorizontal: spacing.md,
        ...styleByVariant,
        shadowColor: variant === "primary" ? colors.primaryContainer : "transparent",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: variant === "primary" ? 0.12 : 0,
        shadowRadius: 14,
        elevation: variant === "primary" ? 2 : 0,
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
          minHeight: 50,
          borderColor: error ? colors.danger : "transparent",
          borderRadius: radii.md,
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
          minHeight: 42,
                minWidth: 110,
                flexGrow: 1,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 7,
                borderRadius: radii.md,
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
    <View style={{ alignSelf: "flex-start", borderRadius: radii.sm, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: palette.backgroundColor }}>
      <Text style={{ color: palette.color, fontSize: 12, fontWeight: "900" }}>{label}</Text>
    </View>
  );
}

export function SearchInput({ placeholder = "Search foods, supplements, nutrients", value, onChangeText }: Pick<TextInputProps, "placeholder" | "value" | "onChangeText">) {
  return (
    <View
      style={{
        minHeight: 50,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        borderRadius: radii.md,
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

export function HomeHeroCard({
  calories,
  imageUri = images.breakfast,
  name,
  nextSupplement,
  onPress,
  steps,
  waterMl,
}: {
  calories: number;
  imageUri?: string;
  name: string;
  nextSupplement?: string;
  onPress?: () => void;
  steps: number;
  waterMl: number;
}) {
  return (
    <TouchableOpacity activeOpacity={0.9} disabled={!onPress} onPress={onPress} style={{ borderRadius: radii.hero, overflow: "hidden", ...shadow }}>
      <ImageBackground resizeMode="cover" source={{ uri: imageUri }} style={{ minHeight: 318, justifyContent: "space-between", padding: spacing.lg }}>
        <View style={{ ...StyleSheetAbsoluteFill, backgroundColor: "rgba(0,33,6,0.76)" }} />
        <View style={{ ...StyleSheetAbsoluteFill, backgroundColor: "rgba(0,0,0,0.14)" }} />
        <View style={{ position: "relative", gap: spacing.sm, borderRadius: radii.xl, backgroundColor: "rgba(0,33,6,0.36)", padding: spacing.md }}>
          <Badge label="Today plan" tone="orange" />
          <Text style={{ color: colors.surface, fontSize: 36, fontWeight: "900", lineHeight: 42 }}>Hi, {name}</Text>
          <Text style={{ maxWidth: 300, color: colors.surface, fontSize: 16, fontWeight: "800", lineHeight: 23 }}>Your wellness plan is ready today.</Text>
        </View>
        <View style={{ position: "relative", gap: spacing.lg, paddingBottom: spacing.xs }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <HeroMetric icon="flame" label="Calories" value={`${Math.round(calories).toLocaleString()} kcal`} />
            <HeroMetric icon="water" label="Water" value={`${Math.round(waterMl).toLocaleString()} ml`} />
            <HeroMetric icon="walk" label="Steps" value={Math.round(steps).toLocaleString()} />
            <HeroMetric icon="medkit" label="Next supplement" value={nextSupplement || "Add routine"} />
          </View>
          <View style={{ alignSelf: "flex-start", minHeight: 50, flexDirection: "row", alignItems: "center", gap: spacing.xs, borderRadius: radii.md, backgroundColor: colors.secondaryContainer, paddingHorizontal: spacing.lg }}>
            <Text style={{ color: colors.surface, fontSize: 15, fontWeight: "900" }}>View today plan</Text>
            <Ionicons color={colors.surface} name="arrow-forward" size={18} />
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const StyleSheetAbsoluteFill = {
  position: "absolute" as const,
  bottom: 0,
  left: 0,
  right: 0,
  top: 0,
};

function HeroMetric({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={{ minWidth: 138, flexGrow: 1, flexBasis: "47%", borderColor: "rgba(255,255,255,0.18)", borderRadius: radii.lg, borderWidth: 1, backgroundColor: "rgba(0,60,18,0.82)", padding: spacing.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
        <Ionicons color={colors.secondaryContainer} name={icon} size={16} />
        <Text style={{ color: colors.surface, fontSize: 11, fontWeight: "900" }}>{label}</Text>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.surface, fontSize: 16, fontWeight: "900", marginTop: 5 }}>{value}</Text>
    </View>
  );
}

export function FilterChip({ active, icon, label, onPress }: { active?: boolean; icon?: IconName; label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        minHeight: 36,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primary : colors.surface,
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
      <View style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.primarySoft }}>
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
  fallbackImage = { uri: images.bowlClose },
  image = { uri: images.bowlClose },
  name,
  nutrients,
  reason,
  score,
}: {
  category?: string;
  fallbackImage?: ImageSourcePropType;
  image?: ImageSourcePropType;
  name: string;
  nutrients?: string[];
  reason?: string;
  score?: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSource = imageFailed ? fallbackImage : image;

  return (
    <AppCard style={{ ...cards.cream, gap: spacing.md, padding: spacing.sm }}>
      <ImageBackground
        imageStyle={{ borderRadius: radii.md }}
        onError={() => setImageFailed(true)}
        source={imageSource}
        style={{ height: 150, justifyContent: "flex-start", alignItems: "flex-end", overflow: "hidden", borderRadius: radii.md }}
      >
        <View style={{ padding: spacing.sm }}>
          {typeof score === "number" ? <Badge label={score >= 0.8 ? "High Match" : `${Math.round(score * 100)}% match`} tone="orange" /> : null}
        </View>
      </ImageBackground>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.sm }}>
        <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.primarySoft }}>
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
    <AppCard style={{ ...cards.default, gap: spacing.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <View style={{ width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: active ? colors.secondaryContainer : colors.surfaceContainerHigh }}>
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
  confidenceScore,
  confidenceLabel,
  explanation,
  fallbackImage = { uri: images.avocado },
  foodName,
  image,
  imageAlt,
  matchedRules,
  nutrients,
  onFeedback,
  onSave,
  score,
  scoreBreakdown,
  synergyReason,
  supplementName,
  warnings,
}: {
  category?: string;
  confidenceScore?: number;
  confidenceLabel?: string;
  explanation: string | { summary: string; reasons?: Array<{ type: string; title: string; message: string; confidence: number }> };
  fallbackImage?: ImageSourcePropType;
  foodName: string;
  image?: ImageSourcePropType;
  imageAlt?: string;
  matchedRules?: Array<{ confidence?: number; lift?: number; explanation?: string; antecedent?: string; consequent?: string; antecedent_items?: string[]; consequent_items?: string[] }>;
  nutrients?: string[];
  onFeedback?: (feedbackType: RecommendationFeedbackAction) => void;
  onSave?: () => void;
  score: number;
  scoreBreakdown?: Record<string, number>;
  synergyReason?: string;
  supplementName?: string;
  warnings?: Array<string | { level: "info" | "caution" | "warning" | "LOW" | "MEDIUM" | "HIGH"; safety_level?: "LOW" | "MEDIUM" | "HIGH"; type: string; title: string; message: string; related_items?: string[] }>;
}) {
  const details = typeof explanation === "string" ? { summary: explanation, reasons: [] } : { summary: explanation.summary, reasons: explanation.reasons ?? [] };
  const warningItems = warnings ?? [];
  const reasonTags = details.reasons.slice(0, 3).map((reason) => reason.title);
  const chips = Array.from(new Set([...(nutrients ?? []), ...reasonTags])).slice(0, 6);
  const [imageFailed, setImageFailed] = useState(false);
  const imageSource = imageFailed ? fallbackImage : image ?? fallbackImage;
  const matchedRule = matchedRules?.[0];
  const ruleConnection = matchedRule ? [
    ...(matchedRule.antecedent_items ?? (matchedRule.antecedent ? [matchedRule.antecedent] : [])),
    ...(matchedRule.consequent_items ?? (matchedRule.consequent ? [matchedRule.consequent] : [])),
  ].join(" -> ") : "";
  const synergyScore = Number(scoreBreakdown?.supplement_score ?? scoreBreakdown?.nutrient_synergy_score ?? 0);
  const matchScore = Number(score) || 0;
  const visibleConfidence = Number(confidenceScore ?? matchScore) || 0;

  return (
    <AppCard style={{ ...cards.default, gap: spacing.md, borderRadius: 24, padding: spacing.sm }}>
      <ImageBackground
        accessibilityLabel={imageAlt}
        imageStyle={{ borderRadius: 22 }}
        onError={() => setImageFailed(true)}
        source={imageSource}
        style={{ height: 208, justifyContent: "space-between", overflow: "hidden", borderRadius: 22, backgroundColor: colors.surfaceContainerHigh }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", padding: spacing.sm }}>
          <Badge label={score >= 0.82 ? "Best Pair" : "Smart Match"} tone="green" />
          <Badge label={confidenceLabel ? `${confidenceLabel} confidence` : `${Math.round(visibleConfidence * 100)}% confidence`} tone="orange" />
        </View>
        <View style={{ backgroundColor: "rgba(18,29,38,0.46)", padding: spacing.md }}>
          <Text style={{ color: colors.surface, fontSize: 24, fontWeight: "900", lineHeight: 30 }}>{foodName}</Text>
          {category ? <Text style={{ color: colors.surfaceOnDark, marginTop: 3 }}>{category}</Text> : null}
        </View>
      </ImageBackground>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <MetricPill icon="sparkles" label="Match" tone="green" value={`${Math.round(matchScore * 100)}%`} />
        <MetricPill icon="analytics" label="Confidence" tone="blue" value={confidenceLabel && confidenceScore == null ? confidenceLabel : `${Math.round(visibleConfidence * 100)}%`} />
        <MetricPill icon="git-network" label="Synergy" tone="orange" value={`${Math.round(synergyScore * 100)}%`} />
      </View>

      {supplementName ? (
        <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, borderRadius: radii.pill, backgroundColor: colors.secondaryContainer, paddingHorizontal: 12, paddingVertical: 7 }}>
          <Ionicons color={colors.surface} name="nutrition" size={iconSizes.sm} />
          <Text style={{ color: colors.surface, fontSize: 12, fontWeight: "900" }}>Works with {supplementName}</Text>
        </View>
      ) : null}
      {synergyReason ? (
        <View style={{ flexDirection: "row", gap: spacing.sm, borderRadius: 18, backgroundColor: colors.cream, padding: spacing.md }}>
          <Ionicons color={colors.secondary} name="leaf" size={iconSizes.md} />
          <Text style={{ flex: 1, color: colors.text, lineHeight: 22 }}>{synergyReason}</Text>
        </View>
      ) : null}
      {matchedRule ? (
        <View style={{ gap: spacing.xs, borderRadius: 18, backgroundColor: colors.primarySoft, padding: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Ionicons color={colors.primary} name="git-network" size={iconSizes.sm} />
            <Text style={{ color: colors.primary, fontWeight: "900" }}>Supplement connection</Text>
          </View>
          {ruleConnection ? <Text style={{ color: colors.text, lineHeight: 20 }}>{ruleConnection.replaceAll("_", " ")}</Text> : null}
          <Text style={{ color: colors.muted, lineHeight: 20 }}>
            Rule confidence {Math.round(Number(matchedRule.confidence ?? 0) * 100)}%
            {matchedRule.lift ? `, lift ${Number(matchedRule.lift).toFixed(2)}` : ""}
          </Text>
          {matchedRule.explanation ? <Text style={{ color: colors.text, lineHeight: 20 }}>{matchedRule.explanation}</Text> : null}
        </View>
      ) : null}
      <View style={{ flexDirection: "row", gap: spacing.sm, borderRadius: 18, backgroundColor: colors.surfaceContainerLow, padding: spacing.md }}>
        <Ionicons color={colors.primary} name="bulb-outline" size={iconSizes.md} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: colors.primary, fontWeight: "900" }}>Why we recommend it</Text>
          <Text style={{ color: colors.text, lineHeight: 22 }}>{details.summary}</Text>
        </View>
      </View>
      {chips.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {chips.map((tag) => (
            <Badge key={tag} label={tag} tone="neutral" />
          ))}
        </View>
      ) : null}
      {warningItems.length ? <WarningBadge warning={warningItems[0]} /> : null}
      <ExplanationPanel explanation={details} />
      {scoreBreakdown ? <ScoreBreakdown scores={scoreBreakdown} /> : null}
      {onFeedback ? <FeedbackButtons onFeedback={onFeedback} onSave={onSave} /> : null}
    </AppCard>
  );
}

export function WarningBadge({ warning }: { warning: string | { level: "info" | "caution" | "warning" | "LOW" | "MEDIUM" | "HIGH"; safety_level?: "LOW" | "MEDIUM" | "HIGH"; type: string; title: string; message: string; related_items?: string[] } }) {
  const title = typeof warning === "string" ? warning : warning.title;
  const message = typeof warning === "string" ? warning : warning.message;
  const level = typeof warning === "string" ? "caution" : warning.level;
  const normalizedLevel = level === "HIGH" ? "warning" : level === "MEDIUM" ? "caution" : level === "LOW" ? "info" : level;
  const palette = normalizedLevel === "warning" ? { bg: colors.dangerSoft, text: colors.danger, icon: "warning" as IconName } : normalizedLevel === "caution" ? { bg: colors.warningSoft, text: colors.warning, icon: "alert-circle" as IconName } : { bg: colors.primarySoft, text: colors.primary, icon: "information-circle" as IconName };
  return (
    <View style={{ flexDirection: "row", gap: spacing.sm, borderRadius: radii.md, backgroundColor: palette.bg, padding: spacing.md }}>
      <Ionicons color={palette.text} name={palette.icon} size={iconSizes.md} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: palette.text, fontWeight: "900" }}>{title}</Text>
        {message !== title ? <Text style={{ color: palette.text, lineHeight: 20, marginTop: 2 }}>{message}</Text> : null}
      </View>
    </View>
  );
}

export function ExplanationPanel({ explanation }: { explanation: { summary: string; reasons?: Array<{ type: string; title: string; message: string; confidence: number }> } }) {
  const [expanded, setExpanded] = useState(false);
  const reasons = explanation.reasons ?? [];
  return (
      <View style={{ borderColor: colors.borderSoft, borderRadius: radii.md, borderWidth: 1, overflow: "hidden", backgroundColor: colors.surface }}>
      <TouchableOpacity accessibilityLabel="Toggle recommendation explanation" onPress={() => setExpanded((value) => !value)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md }}>
        <Text style={{ color: colors.text, fontWeight: "900" }}>Why this recommendation?</Text>
        <Ionicons color={colors.primary} name={expanded ? "chevron-up" : "chevron-down"} size={iconSizes.md} />
      </TouchableOpacity>
      {expanded ? (
        <View style={{ gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
          {reasons.length ? reasons.map((reason) => (
            <View key={`${reason.type}-${reason.title}`} style={{ gap: 3 }}>
              <Text style={{ color: colors.text, fontWeight: "800" }}>{reason.title}</Text>
              <Text style={{ color: colors.muted, lineHeight: 21 }}>{reason.message}</Text>
              <Text style={{ color: colors.primary, fontWeight: "800" }}>{Math.round(reason.confidence * 100)}% reason strength</Text>
            </View>
          )) : <Text style={{ color: colors.muted, lineHeight: 21 }}>{explanation.summary}</Text>}
        </View>
      ) : null}
    </View>
  );
}

export function ScoreBreakdown({ scores }: { scores: Record<string, number> }) {
  const labels: Record<string, string> = {
    content_based_score: "Nutrients",
    supplement_score: "Supplement synergy",
    association_rule_score: "Rules",
    collaborative_score: "Similar users",
    nutrient_synergy_score: "Interaction evidence",
    safety_score: "Safety",
    profile_match_score: "Profile",
    feedback_score: "Feedback",
  };
  const preferredKeys = [
    "content_based_score",
    "supplement_score",
    "nutrient_synergy_score",
    "association_rule_score",
    "collaborative_score",
    "profile_match_score",
    "safety_score",
    "feedback_score",
  ];
  const entries = preferredKeys
    .filter((key) => key in scores)
    .map((key) => [key, scores[key]] as const)
    .filter(([, rawValue]) => Number.isFinite(Number(rawValue)));
  return (
    <View style={{ gap: spacing.sm }}>
      {entries.map(([key, rawValue]) => {
        const value = Math.max(0, Math.min(1, Number(rawValue) || 0));
        return (
          <View key={key} style={{ gap: 5 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: colors.muted, fontWeight: "800" }}>{labels[key] ?? key}</Text>
              <Text style={{ color: colors.text, fontWeight: "900" }}>{Math.round(value * 100)}%</Text>
            </View>
            <View style={{ height: 8, overflow: "hidden", borderRadius: radii.pill, backgroundColor: colors.surfaceContainerHigh }}>
              <View style={{ width: `${value * 100}%` as DimensionValue, height: 8, borderRadius: radii.pill, backgroundColor: key === "safety_score" ? colors.primary : colors.secondaryContainer }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function MetricPill({ icon, label, tone, value }: { icon: IconName; label: string; tone: "green" | "orange" | "blue"; value: string }) {
  const palette = {
    green: { bg: colors.primarySoft, icon: colors.primary },
    orange: { bg: colors.secondarySoft, icon: colors.secondary },
    blue: { bg: colors.blueSoft, icon: colors.blue },
  }[tone];
  return (
    <View style={{ flex: 1, minHeight: 82, justifyContent: "center", gap: 5, borderRadius: 18, backgroundColor: palette.bg, padding: spacing.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <Ionicons color={palette.icon} name={icon} size={iconSizes.sm} />
        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "900" }}>{label}</Text>
      </View>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "900" }}>{value}</Text>
    </View>
  );
}

type RecommendationFeedbackAction = "liked" | "disliked" | "saved" | "tried" | "not_interested" | "allergy_issue" | "do_not_eat" | "too_expensive" | "not_available" | "already_tried" | "good_recommendation";

export function FeedbackButtons({ onFeedback, onSave }: { onFeedback: (feedbackType: RecommendationFeedbackAction) => void; onSave?: () => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
      <FilterChip icon="heart" label="Like" onPress={() => onFeedback("liked")} />
      <FilterChip icon="close-circle" label="Dislike" onPress={() => onFeedback("disliked")} />
      <FilterChip icon="bookmark" label="Save" onPress={() => { onFeedback("saved"); onSave?.(); }} />
      <FilterChip icon="checkmark-done-circle" label="Tried" onPress={() => onFeedback("tried")} />
      <FilterChip icon="remove-circle" label="Skip" onPress={() => onFeedback("not_interested")} />
      <FilterChip icon="alert-circle" label="Allergy" onPress={() => onFeedback("allergy_issue")} />
      <FilterChip icon="cash" label="Cost" onPress={() => onFeedback("too_expensive")} />
      <FilterChip icon="ban" label="Unavailable" onPress={() => onFeedback("not_available")} />
    </View>
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

export const AppHeader = AppTopBar;
export const WellnessCard = AppCard;
export const PrimaryButton = AppButton;

export function SecondaryButton(props: Omit<ComponentProps<typeof AppButton>, "variant">) {
  return <AppButton {...props} variant="secondary" />;
}

export function ReasonChip({ icon = "leaf", label, tone = "green" }: { icon?: IconName; label: string; tone?: "green" | "orange" | "neutral" }) {
  const palette = {
    green: { bg: colors.primarySoft, fg: colors.primary },
    orange: { bg: colors.secondarySoft, fg: colors.secondary },
    neutral: { bg: colors.surfaceContainerHigh, fg: colors.muted },
  }[tone];
  return (
    <View style={{ minHeight: 34, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radii.pill, backgroundColor: palette.bg, paddingHorizontal: 11 }}>
      <Ionicons color={palette.fg} name={icon} size={iconSizes.sm} />
      <Text style={{ color: palette.fg, fontSize: 12, fontWeight: "900" }}>{label}</Text>
    </View>
  );
}

export function SafetyAlertCard({ message, title = "Safety note", tone = "warning" }: { message: string; title?: string; tone?: "warning" | "danger" | "info" }) {
  const palette = tone === "danger" ? { bg: colors.dangerSoft, fg: colors.danger, icon: "warning" as IconName } : tone === "info" ? { bg: colors.primarySoft, fg: colors.primary, icon: "shield-checkmark" as IconName } : { bg: colors.warningSoft, fg: colors.warning, icon: "alert-circle" as IconName };
  return (
    <View style={{ flexDirection: "row", gap: spacing.sm, borderRadius: radii.lg, backgroundColor: palette.bg, padding: spacing.md }}>
      <View style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.surface }}>
        <Ionicons color={palette.fg} name={palette.icon} size={iconSizes.md} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: palette.fg, fontSize: 16, fontWeight: "900" }}>{title}</Text>
        <Text style={{ color: palette.fg, lineHeight: 21, marginTop: 3 }}>{message}</Text>
      </View>
    </View>
  );
}

export function ProgressRing({ color = colors.primary, label, progress, size = 116, value }: { color?: string; label: string; progress: number; size?: number; value: string }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalized = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg height={size} width={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} fill="transparent" r={radius} stroke={colors.surfaceContainerHigh} strokeWidth={strokeWidth} />
        <Circle cx={size / 2} cy={size / 2} fill="transparent" r={radius} rotation="-90" origin={`${size / 2}, ${size / 2}`} stroke={color} strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - normalized)} strokeLinecap="round" strokeWidth={strokeWidth} />
      </Svg>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "900", marginTop: 1 }}>{label}</Text>
    </View>
  );
}

export function MacroProgressBar({ color = colors.primary, label, target, unit = "g", value }: { color?: string; label: string; target: number; unit?: string; value: number }) {
  const progress = Math.max(0, Math.min(1, target ? value / target : 0));
  return (
    <View style={{ gap: 7 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: "900" }}>{label}</Text>
        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>{Math.round(value).toLocaleString()} / {target.toLocaleString()} {unit}</Text>
      </View>
      <View style={{ height: 10, overflow: "hidden", borderRadius: radii.pill, backgroundColor: colors.surfaceContainerHigh }}>
        <View style={{ width: `${progress * 100}%` as DimensionValue, height: 10, borderRadius: radii.pill, backgroundColor: color }} />
      </View>
    </View>
  );
}

export function TrackingCard({ children, icon = "analytics", title }: { children: ReactNode; icon?: IconName; title: string }) {
  return (
    <AppCard style={{ gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <View style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.primarySoft }}>
          <Ionicons color={colors.primary} name={icon} size={iconSizes.md} />
        </View>
        <Text style={{ flex: 1, color: colors.text, fontSize: 17, fontWeight: "900" }}>{title}</Text>
      </View>
      {children}
    </AppCard>
  );
}

export function WaterTrackerCard({ onAdd, targetMl = 2500, valueMl }: { onAdd?: () => void; targetMl?: number; valueMl: number }) {
  return (
    <TrackingCard icon="water" title="Water">
      <MacroProgressBar color={colors.blue} label="Hydration" target={targetMl} unit="ml" value={valueMl} />
      {onAdd ? (
        <TouchableOpacity onPress={onAdd} style={{ minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.blueSoft }}>
          <Text style={{ color: colors.blue, fontWeight: "900" }}>Add a glass</Text>
        </TouchableOpacity>
      ) : null}
    </TrackingCard>
  );
}

export function StepProgressCard({ onSave, target = 8000, value }: { onSave?: () => void; target?: number; value: number }) {
  return (
    <TrackingCard icon="walk" title="Steps">
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
        <ProgressRing color={colors.tomato} label="steps" progress={target ? value / target : 0} size={104} value={value.toLocaleString()} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>{Math.max(target - value, 0).toLocaleString()} left</Text>
          <Text style={typography.body}>Keep the movement goal visible without leaving the wellness dashboard.</Text>
        </View>
      </View>
      {onSave ? (
        <TouchableOpacity onPress={onSave} style={{ minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.dangerSoft }}>
          <Text style={{ color: colors.tomato, fontWeight: "900" }}>Update steps</Text>
        </TouchableOpacity>
      ) : null}
    </TrackingCard>
  );
}

export function ChatMessageBubble({ children, role = "assistant" }: { children: ReactNode; role?: "assistant" | "user" }) {
  const isAssistant = role === "assistant";
  return (
    <View style={{ alignItems: isAssistant ? "flex-start" : "flex-end" }}>
      <View
        style={{
          maxWidth: "88%",
          borderBottomLeftRadius: isAssistant ? 8 : 28,
          borderBottomRightRadius: isAssistant ? 28 : 8,
          borderRadius: 28,
          backgroundColor: isAssistant ? colors.surfaceContainerHigh : colors.primary,
          padding: spacing.lg,
        }}
      >
        {isAssistant ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.xs }}>
            <Ionicons color={colors.primary} name="sparkles" size={16} />
            <Text style={{ color: colors.primary, fontWeight: "900" }}>I-NutriGuide AI</Text>
          </View>
        ) : null}
        <Text style={{ color: isAssistant ? colors.text : colors.surface, fontSize: 16, lineHeight: 25 }}>{children}</Text>
      </View>
    </View>
  );
}

export function QuickPromptChips({ onPick, prompts }: { onPick: (prompt: string) => void; prompts: string[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
      {prompts.map((prompt) => (
        <FilterChip icon="sparkles" key={prompt} label={prompt} onPress={() => onPick(prompt)} />
      ))}
    </View>
  );
}

export function TypingIndicator({ text = "I-NutriGuide AI is thinking..." }: { text?: string }) {
  return (
    <View style={{ alignSelf: "flex-start", minHeight: 44, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.surfaceContainerHigh, paddingHorizontal: spacing.md }}>
      <ActivityIndicator color={colors.primary} size="small" />
      <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "900" }}>{text}</Text>
    </View>
  );
}

export function ChatInputBar({
  disabled,
  onChangeText,
  onSend,
  value,
}: {
  disabled?: boolean;
  onChangeText: (value: string) => void;
  onSend: () => void;
  value: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing.sm }}>
      <View style={{ flex: 1, minHeight: 58, maxHeight: 124, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderColor: colors.borderSoft, borderRadius: radii.xl, borderWidth: 1, backgroundColor: colors.surface, paddingHorizontal: spacing.md, ...shadow }}>
        <Ionicons color={colors.muted} name="chatbubble-ellipses-outline" size={22} />
        <TextInput
          accessibilityLabel="Chat message"
          multiline
          onChangeText={onChangeText}
          placeholder="Ask about supplements, meals, or safety..."
          placeholderTextColor={colors.placeholder}
          style={{ flex: 1, minHeight: 44, maxHeight: 104, color: colors.text, fontSize: 15, fontWeight: "700", paddingVertical: spacing.sm }}
          value={value}
        />
      </View>
      <TouchableOpacity accessibilityLabel="Send chat message" disabled={disabled} onPress={onSend} style={{ width: 56, height: 56, alignItems: "center", justifyContent: "center", borderRadius: radii.pill, backgroundColor: colors.primary, opacity: disabled ? 0.65 : 1, ...shadow }}>
        <Ionicons color={colors.surface} name="send" size={20} />
      </TouchableOpacity>
    </View>
  );
}

export function ChatAssistant({ onClear, clearing }: { clearing?: boolean; onClear: () => void }) {
  return (
    <AppCard style={{ gap: spacing.sm, backgroundColor: colors.primary }}>
      <Badge label="AI guide" tone="orange" />
      <Text style={{ color: colors.surface, fontSize: 24, fontWeight: "900", lineHeight: 31 }}>Ask about your food and supplements</Text>
      <Text style={{ color: colors.surfaceOnDark, fontSize: 15, lineHeight: 22 }}>I use your profile and saved recommendations for simple, cautious wellness guidance.</Text>
      <TouchableOpacity accessibilityLabel="Clear chat history" disabled={clearing} onPress={onClear} style={{ alignSelf: "flex-start", minHeight: 38, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radii.pill, backgroundColor: colors.surface, paddingHorizontal: spacing.md }}>
        <Ionicons color={colors.primary} name="refresh" size={16} />
        <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "900" }}>{clearing ? "Clearing..." : "Clear chat"}</Text>
      </TouchableOpacity>
    </AppCard>
  );
}

export function AddWaterCard({ onAdd, onRemove, targetMl = 2500, valueMl }: { onAdd: () => void; onRemove: () => void; targetMl?: number; valueMl: number }) {
  const cups = Math.max(0, Math.round(valueMl / 250));
  const targetCups = Math.max(1, Math.round(targetMl / 250));
  return (
    <AppCard style={{ gap: spacing.sm, backgroundColor: colors.blueSoft, padding: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <View style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: radii.lg, backgroundColor: colors.surface }}>
          <Ionicons color={colors.blue} name="water" size={25} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }}>Add Water</Text>
          <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "800", marginTop: 3 }}>{cups} of {targetCups} glasses today</Text>
        </View>
        <Text style={{ color: colors.blue, fontSize: 22, fontWeight: "900" }}>{Math.round(valueMl).toLocaleString()} ml</Text>
      </View>
      <MacroProgressBar color={colors.blue} label="Hydration" target={targetMl} unit="ml" value={valueMl} />
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <TouchableOpacity onPress={onRemove} style={{ flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.surface }}>
          <Text style={{ color: colors.blue, fontWeight: "900" }}>-250 ml</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onAdd} style={{ flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.blue }}>
          <Text style={{ color: colors.surface, fontWeight: "900" }}>+250 ml</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800", lineHeight: 18 }}>Hydration tip: small glasses through the day are easier to keep consistent.</Text>
    </AppCard>
  );
}

export function FoodSearchLogCard({ children, onSearchChange, searchValue }: { children?: ReactNode; onSearchChange: (value: string) => void; searchValue: string }) {
  return (
    <AppCard style={{ gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <View style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.primarySoft }}>
          <Ionicons color={colors.primary} name="search" size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 19, fontWeight: "900" }}>Search to log food</Text>
          <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", marginTop: 2 }}>Find a food, choose grams, then tap add.</Text>
        </View>
      </View>
      <SearchInput onChangeText={onSearchChange} placeholder="Search food to log..." value={searchValue} />
      {children}
    </AppCard>
  );
}

function entryMeal(entry: FoodEntry) {
  if (entry.meal_type) {
    return entry.meal_type;
  }
  const match = entry.food_name.match(/\((Breakfast|Lunch|Dinner|Snack)\)$/i);
  return match?.[1] ?? "Snack";
}

export function LoggedFoodList({ entries, onEdit, onRemove, title = "Logged food today" }: { entries: FoodEntry[]; onEdit?: (index: number) => void; onRemove?: (index: number) => void; title?: string }) {
  const groups = ["Breakfast", "Lunch", "Dinner", "Snack"].map((meal) => ({ meal, entries: entries.map((entry, index) => ({ entry, index })).filter((item) => entryMeal(item.entry).toLowerCase() === meal.toLowerCase()) }));
  return (
    <AppCard style={{ gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <Text style={typography.section}>{title}</Text>
        <Badge label={`${entries.length} foods`} tone="neutral" />
      </View>
      {entries.length ? (
        groups.map((group) =>
          group.entries.length ? (
            <View key={group.meal} style={{ gap: spacing.xs }}>
              <Text style={{ color: colors.secondary, fontSize: 12, fontWeight: "900", textTransform: "uppercase" }}>{group.meal}</Text>
              {group.entries.map(({ entry, index }) => (
                <FoodLogItem calories={entry.calories} carbs={entry.carbs_g} fat={entry.fat_g} key={`${entry.timestamp}-${index}`} name={entry.food_name.replace(/\s+\((Breakfast|Lunch|Dinner|Snack)\)$/i, "")} onEdit={onEdit ? () => onEdit(index) : undefined} onRemove={onRemove ? () => onRemove(index) : undefined} protein={entry.protein_g} serving={entry.serving_g} time={entry.time} unit={entry.unit} />
              ))}
            </View>
          ) : null,
        )
      ) : (
        <Text style={typography.body}>No food logged yet today. Search above to add your first food.</Text>
      )}
    </AppCard>
  );
}

export function TrackingSummaryCards({
  calorieTarget,
  calories,
  carbs,
  carbsTarget,
  fat,
  fatTarget,
  protein,
  proteinTarget,
  steps,
  stepsTarget,
  waterMl,
  waterTarget,
}: {
  calorieTarget: number;
  calories: number;
  carbs: number;
  carbsTarget: number;
  fat: number;
  fatTarget: number;
  protein: number;
  proteinTarget: number;
  steps: number;
  stepsTarget: number;
  waterMl: number;
  waterTarget: number;
}) {
  const items = [
    { color: colors.primary, icon: "flame" as IconName, label: "Calories", note: "Steady energy", target: calorieTarget, unit: "kcal", value: calories },
    { color: colors.blue, icon: "water" as IconName, label: "Water", note: "Hydration rhythm", target: waterTarget, unit: "ml", value: waterMl },
    { color: colors.tomato, icon: "walk" as IconName, label: "Steps", note: "Movement streak", target: stepsTarget, unit: "steps", value: steps },
    { color: colors.primaryContainer, icon: "fitness" as IconName, label: "Protein", note: "Recovery support", target: proteinTarget, unit: "g", value: protein },
    { color: colors.warning, icon: "nutrition" as IconName, label: "Carbs", note: "Fuel balance", target: carbsTarget, unit: "g", value: carbs },
    { color: colors.secondaryContainer, icon: "leaf" as IconName, label: "Fat", note: "Vitamin support", target: fatTarget, unit: "g", value: fat },
  ];
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      {items.map((item) => (
        <View key={item.label} style={{ width: "48%", minWidth: 150, flexGrow: 1, gap: spacing.xs, borderColor: colors.borderSoft, borderRadius: radii.lg, borderWidth: 1, backgroundColor: colors.surface, padding: spacing.md, ...shadow }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs }}>
            <View style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.surfaceContainerLow }}>
              <Ionicons color={item.color} name={item.icon} size={18} />
            </View>
            <Text style={{ color: item.color, fontSize: 12, fontWeight: "900" }}>{Math.round(Math.min(100, item.target ? (item.value / item.target) * 100 : 0))}%</Text>
          </View>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>{item.label}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>{item.note}</Text>
          <MacroProgressBar color={item.color} label="" target={item.target} unit={item.unit} value={item.value} />
        </View>
      ))}
    </View>
  );
}

export function FoodLogItem({ calories, carbs, fat, name, onEdit, onRemove, protein, serving, time, unit }: { calories?: number; carbs?: number; fat?: number; name: string; onEdit?: () => void; onRemove?: () => void; protein?: number; serving?: number; time?: string; unit?: string }) {
  return (
    <View style={{ minHeight: 58, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surfaceContainerLow, padding: spacing.sm }}>
      <View style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.cream }}>
        <Ionicons color={colors.secondary} name="restaurant" size={18} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: "900" }}>{name}</Text>
        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", marginTop: 2 }}>{[serving ? `${serving}${unit && unit !== "g" ? ` ${unit}` : "g"}` : null, calories != null ? `${calories} kcal` : null, protein != null ? `${protein}g protein` : null, carbs != null ? `${carbs}g carbs` : null, fat != null ? `${fat}g fat` : null, time || null].filter(Boolean).join(" - ")}</Text>
      </View>
      {onEdit ? (
        <TouchableOpacity accessibilityLabel={`Edit ${name}`} onPress={onEdit} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
          <Ionicons color={colors.primary} name="create-outline" size={18} />
        </TouchableOpacity>
      ) : null}
      {onRemove ? (
        <TouchableOpacity accessibilityLabel={`Remove ${name}`} onPress={onRemove} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
          <Ionicons color={colors.danger} name="trash-outline" size={18} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export const ScoreBreakdownCard = ScoreBreakdown;

export function FeedbackModal({ onClose, onFeedback, visible }: { onClose: () => void; onFeedback: (feedbackType: RecommendationFeedbackAction) => void; visible: boolean }) {
  const choose = (feedbackType: RecommendationFeedbackAction) => {
    onFeedback(feedbackType);
    onClose();
  };
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay }}>
        <View style={{ borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }}>Food feedback</Text>
            <TouchableOpacity accessibilityLabel="Close feedback" onPress={onClose} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
              <Ionicons color={colors.muted} name="close" size={iconSizes.lg} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            <FilterChip icon="heart" label="Like" onPress={() => choose("liked")} />
            <FilterChip icon="bookmark" label="Save" onPress={() => choose("saved")} />
            <FilterChip icon="checkmark-done-circle" label="Tried" onPress={() => choose("tried")} />
            <FilterChip icon="close-circle" label="Not for me" onPress={() => choose("not_interested")} />
            <FilterChip icon="alert-circle" label="Allergy" onPress={() => choose("allergy_issue")} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function AiAssistantFab() {
  return (
    <TouchableOpacity
      accessibilityLabel="Open AI assistant"
      onPress={() => router.push("/tabs/chat" as never)}
      style={{
        position: "absolute",
        right: spacing.lg,
        bottom: spacing.lg,
        width: 58,
        height: 58,
        alignItems: "center",
        justifyContent: "center",
        borderColor: "rgba(255,255,255,0.72)",
        borderRadius: radii.pill,
        borderWidth: 2,
        backgroundColor: colors.secondaryContainer,
        shadowColor: colors.secondary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
        elevation: 6,
      }}
    >
      <Ionicons color={colors.surface} name="chatbubble-ellipses" size={26} />
    </TouchableOpacity>
  );
}

export function BottomTabBar({ children }: { children: ReactNode }) {
  return (
    <View style={{ borderColor: colors.borderSoft, borderRadius: 30, borderWidth: 1, backgroundColor: colors.surface, padding: spacing.sm }}>
      {children}
    </View>
  );
}

export function OnboardingShell({
  children,
  current,
  subtitle,
  title,
  total = 4,
}: {
  children: ReactNode;
  current: number;
  subtitle: string;
  title: string;
  total?: number;
}) {
  return (
    <View style={{ gap: spacing.xl }}>
      <ProgressSteps current={current} total={total} />
      <View style={{ alignItems: "center", gap: spacing.sm }}>
        <Text style={{ color: colors.primary, fontSize: 30, fontWeight: "900", lineHeight: 38, textAlign: "center" }}>{title}</Text>
        <Text style={{ maxWidth: 330, color: colors.muted, fontSize: 16, lineHeight: 24, textAlign: "center" }}>{subtitle}</Text>
      </View>
      {children}
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", lineHeight: 18, textAlign: "center" }}>
        This app gives nutritional guidance and does not replace professional medical advice.
      </Text>
    </View>
  );
}

export function OnboardingOptionCard({
  active,
  description,
  icon = "leaf",
  label,
  onPress,
}: {
  active?: boolean;
  description?: string;
  icon?: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={{
        minHeight: 112,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        borderColor: active ? colors.primary : "transparent",
        borderRadius: radii.xl,
        borderWidth: 2,
        backgroundColor: active ? colors.primarySoft : colors.cream,
        padding: spacing.lg,
      }}
    >
      <View style={{ width: 56, height: 56, alignItems: "center", justifyContent: "center", borderRadius: radii.pill, backgroundColor: active ? colors.primary : colors.secondarySoft }}>
        <Ionicons color={active ? colors.surface : colors.secondary} name={icon} size={24} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "900", lineHeight: 28 }}>{label}</Text>
        {description ? <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 2 }}>{description}</Text> : null}
      </View>
      {active ? <Ionicons color={colors.primary} name="checkmark-circle" size={24} /> : null}
    </TouchableOpacity>
  );
}
