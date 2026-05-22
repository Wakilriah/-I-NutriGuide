export const colors = {
  background: "#EFFDED",
  cream: "#FFF8ED",
  surface: "#FFFFFF",
  surfaceSoft: "#F6FFF4",
  surfaceContainerLowest: "#FFFFFF",
  surfaceContainerLow: "#E9F8E7",
  surfaceContainer: "#E4F2E1",
  surfaceContainerHigh: "#DEECDC",
  surfaceContainerHighest: "#D8E6D6",
  primary: "#0F631B",
  primaryContainer: "#2F7D32",
  primaryDark: "#002203",
  primaryFresh: "#88D982",
  primarySoft: "#DFF2DB",
  mint: "#EFFDED",
  secondary: "#914D00",
  secondaryContainer: "#FC9430",
  secondarySoft: "#FFDCC3",
  tomato: "#C44022",
  text: "#131E14",
  muted: "#40493D",
  mutedSoft: "#707A6C",
  border: "#BFCABA",
  borderSoft: "#D8E6D6",
  danger: "#BA1A1A",
  dangerSoft: "#FFDAD6",
  warning: "#914D00",
  warningSoft: "#FFF0DB",
  successText: "#005311",
  overlay: "rgba(19,30,20,0.46)",
  overlaySoft: "rgba(19,30,20,0.22)",
  surfaceOnDark: "#E7F5E4",
  placeholder: "#7B8578",
};

export const radii = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  hero: 32,
  pill: 999,
};

export const spacing = {
  xs: 6,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

export const iconSizes = {
  sm: 15,
  md: 19,
  lg: 24,
  xl: 30,
};

export const shadow = {
  shadowColor: "#2F7D32",
  shadowOffset: { width: 0, height: 18 },
  shadowOpacity: 0.08,
  shadowRadius: 28,
  elevation: 4,
};

export const warmShadow = {
  shadowColor: "#FC9430",
  shadowOffset: { width: 0, height: 14 },
  shadowOpacity: 0.08,
  shadowRadius: 24,
  elevation: 3,
};

export const gradients = {
  primary: [colors.primary, colors.primaryContainer],
  warm: [colors.cream, colors.secondarySoft],
  heroOverlay: [colors.overlaySoft, colors.overlay],
};

export const cards = {
  default: {
    borderColor: "rgba(255,255,255,0.72)",
    borderRadius: radii.xl,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.88)",
    padding: spacing.lg,
    ...shadow,
  },
  glass: {
    borderColor: "rgba(255,255,255,0.58)",
    borderRadius: radii.xl,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
    ...shadow,
  },
  soft: {
    borderColor: "rgba(255,255,255,0.72)",
    borderRadius: radii.xl,
    borderWidth: 1,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.lg,
  },
  cream: {
    borderColor: "rgba(252,148,48,0.16)",
    borderRadius: radii.xl,
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
    fontSize: 32,
    fontWeight: "900" as const,
    lineHeight: 40,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800" as const,
  },
  section: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900" as const,
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
};
