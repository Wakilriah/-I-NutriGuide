export const colors = {
  background: "#F3FAF3",
  cream: "#FFF8ED",
  surface: "#FFFFFF",
  surfaceSoft: "#F7FCF6",
  primary: "#2F7D32",
  primaryDark: "#1F2A1F",
  primaryFresh: "#6BBF59",
  primarySoft: "#E4F5E1",
  mint: "#F3FAF3",
  secondary: "#F28C28",
  secondarySoft: "#FFF0DB",
  tomato: "#D94F30",
  text: "#1F2A1F",
  muted: "#6B756B",
  border: "#DDEBDD",
  danger: "#D94F30",
  dangerSoft: "#FFF0EA",
  warning: "#A65F16",
  warningSoft: "#FFF4DE",
  successText: "#245D27",
  overlay: "rgba(31,42,31,0.36)",
  overlaySoft: "rgba(31,42,31,0.24)",
  surfaceOnDark: "#F4FFF2",
  placeholder: "#8A948A",
};

export const radii = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
};

export const iconSizes = {
  sm: 15,
  md: 19,
  lg: 24,
  xl: 30,
};

export const shadow = {
  shadowColor: "#1F2A1F",
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.1,
  shadowRadius: 24,
  elevation: 4,
};

export const gradients = {
  primary: [colors.primary, colors.primaryFresh],
  warm: [colors.cream, colors.secondarySoft],
  heroOverlay: [colors.overlaySoft, colors.overlay],
};

export const cards = {
  default: {
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    ...shadow,
  },
  soft: {
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
  },
};

export const images = {
  bowls: "https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=1200&q=85",
  bowlClose: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=85",
  breakfast: "https://images.unsplash.com/photo-1494390248081-4e521a5940db?auto=format&fit=crop&w=900&q=85",
  greens: "https://images.unsplash.com/photo-1506807803488-8eafc15316c7?auto=format&fit=crop&w=900&q=85",
};

export const typography = {
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900" as const,
    lineHeight: 36,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800" as const,
  },
  section: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900" as const,
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
  },
};
