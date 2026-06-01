export const colors = {
  background: "#F7F9FF",
  mintBackground: "#F4FCE3",
  cream: "#FFF7EA",
  surface: "#FFFFFF",
  surfaceSoft: "#F7F9FF",
  surfaceContainerLowest: "#FFFFFF",
  surfaceContainerLow: "#EDF4FF",
  surfaceContainer: "#E4EFFD",
  surfaceContainerHigh: "#DFE9F7",
  surfaceContainerHighest: "#D9E3F1",
  primary: "#006B23",
  primaryContainer: "#098730",
  primaryDark: "#002106",
  primaryFresh: "#71DD7A",
  primarySoft: "#E8F8EA",
  mint: "#EAF7EF",
  secondary: "#845400",
  secondaryContainer: "#FDA611",
  secondarySoft: "#FFE5C2",
  tomato: "#B8482D",
  blue: "#376A99",
  blueSoft: "#E2ECF5",
  text: "#121D26",
  muted: "#3F4A3D",
  mutedSoft: "#6F7A6C",
  border: "#BECAB9",
  borderSoft: "#D9E3F1",
  danger: "#B42318",
  dangerSoft: "#FDE3DF",
  warning: "#8A5A00",
  warningSoft: "#FFF1D9",
  successText: "#155C34",
  overlay: "rgba(14,22,16,0.48)",
  overlaySoft: "rgba(14,22,16,0.18)",
  surfaceOnDark: "#EAF3E9",
  placeholder: "#899185",
};

export const radii = {
  sm: 6,
  md: 16,
  lg: 24,
  xl: 32,
  hero: 32,
  pill: 999,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
};

export const iconSizes = {
  sm: 15,
  md: 19,
  lg: 24,
  xl: 30,
};

export const shadow = {
  shadowColor: "#006B23",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.08,
  shadowRadius: 20,
  elevation: 2,
};

export const dockShadow = {
  shadowColor: "#0E1610",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.14,
  shadowRadius: 24,
  elevation: 8,
};

export const warmShadow = {
  shadowColor: "#935A12",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
  elevation: 2,
};

export const gradients = {
  primary: [colors.primary, colors.primaryContainer],
  warm: [colors.cream, colors.secondarySoft],
  heroOverlay: [colors.overlaySoft, colors.overlay],
};

export const cards = {
  default: {
    borderColor: colors.borderSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadow,
  },
  glass: {
    borderColor: colors.borderSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.94)",
    padding: spacing.lg,
    ...shadow,
  },
  onboardingGlass: {
    borderColor: colors.borderSoft,
    borderRadius: radii.hero,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.94)",
    padding: spacing.lg,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 3,
  },
  soft: {
    borderColor: colors.borderSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.lg,
  },
  cream: {
    borderColor: "#F2D7B3",
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.cream,
    padding: spacing.lg,
    ...warmShadow,
  },
};

const welcomeBackgroundImage = "https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=1200&q=85";

export const images = {
  welcomeBackground: welcomeBackgroundImage,
  bowls: welcomeBackgroundImage,
  bowlClose: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=85",
  breakfast: "https://images.unsplash.com/photo-1494390248081-4e521a5940db?auto=format&fit=crop&w=900&q=85",
  greens: "https://images.unsplash.com/photo-1506807803488-8eafc15316c7?auto=format&fit=crop&w=900&q=85",
  avocado: "https://images.unsplash.com/photo-1603046891744-76e6300f82ef?auto=format&fit=crop&w=900&q=85",
  salmonBowl: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=85",
  avatarWoman: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
  avatarMan: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80",
};

export const typography = {
  display: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900" as const,
    lineHeight: 40,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900" as const,
    lineHeight: 34,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800" as const,
  },
  section: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "900" as const,
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
};
