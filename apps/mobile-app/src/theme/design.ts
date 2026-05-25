export const colors = {
  background: "#F7F8F5",
  cream: "#FFF7EA",
  surface: "#FFFFFF",
  surfaceSoft: "#F3F6F0",
  surfaceContainerLowest: "#FFFFFF",
  surfaceContainerLow: "#EEF3EA",
  surfaceContainer: "#E7EDE2",
  surfaceContainerHigh: "#DDE5D7",
  surfaceContainerHighest: "#D2DCCC",
  primary: "#1F6F43",
  primaryContainer: "#2F8A5B",
  primaryDark: "#0B3420",
  primaryFresh: "#79B98B",
  primarySoft: "#E3F0E6",
  mint: "#EAF5EC",
  secondary: "#935A12",
  secondaryContainer: "#D9822B",
  secondarySoft: "#FFE5C2",
  tomato: "#B8482D",
  blue: "#376A99",
  blueSoft: "#E2ECF5",
  text: "#18211A",
  muted: "#5D685B",
  mutedSoft: "#7B8678",
  border: "#D2D9CD",
  borderSoft: "#E2E8DE",
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
  md: 8,
  lg: 10,
  xl: 12,
  hero: 16,
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
  shadowColor: "#18211A",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.06,
  shadowRadius: 18,
  elevation: 2,
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

export const images = {
  bowls: "https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=1200&q=85",
  bowlClose: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=85",
  breakfast: "https://images.unsplash.com/photo-1494390248081-4e521a5940db?auto=format&fit=crop&w=900&q=85",
  greens: "https://images.unsplash.com/photo-1506807803488-8eafc15316c7?auto=format&fit=crop&w=900&q=85",
  avocado: "https://images.unsplash.com/photo-1603046891744-76e6300f82ef?auto=format&fit=crop&w=900&q=85",
  salmonBowl: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=85",
  avatarWoman: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
  avatarMan: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80",
};

export const typography = {
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
