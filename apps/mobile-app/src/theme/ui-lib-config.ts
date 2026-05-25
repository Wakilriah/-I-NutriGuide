import { Colors, Spacings, ThemeManager, Typography } from "react-native-ui-lib";
import { colors, radii, spacing } from "./design";

export function setupUILib() {
  Colors.loadColors({
    primary: colors.primary,
    secondary: colors.secondary,
    success: colors.primaryFresh,
    error: colors.danger,
    warning: colors.warning,
    text: colors.text,
    muted: colors.muted,
    surface: colors.surface,
    background: colors.background,
    mint: colors.mint,
    orange: colors.secondaryContainer,
    blue: colors.blue,
    white: colors.surface,
  });

  Typography.loadTypographies({
    h1: { fontSize: 28, fontWeight: "900", color: colors.text, lineHeight: 34 },
    h2: { fontSize: 22, fontWeight: "900", color: colors.text, lineHeight: 28 },
    h3: { fontSize: 18, fontWeight: "800", color: colors.text, lineHeight: 24 },
    body: { fontSize: 15, fontWeight: "400", color: colors.muted, lineHeight: 22 },
    label: { fontSize: 12, fontWeight: "900", color: colors.text, textTransform: "uppercase" },
    small: { fontSize: 12, fontWeight: "700", color: colors.muted, lineHeight: 17 },
  });

  Spacings.loadSpacings({
    page: spacing.lg,
    card: spacing.md,
    gridGutter: spacing.sm,
  });

  ThemeManager.setComponentTheme("Card", {
    enableShadow: true,
    elevation: 2,
    borderRadius: radii.lg,
    backgroundColor: Colors.surface,
    containerStyle: {
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },
  });

  ThemeManager.setComponentTheme("Button", {
    borderRadius: radii.md,
    backgroundColor: Colors.primary,
    labelStyle: { fontWeight: "900" },
  });

  ThemeManager.setComponentTheme("TextField", {
    fieldStyle: {
      minHeight: 48,
      borderRadius: radii.md,
      backgroundColor: colors.surfaceContainerLow,
      paddingHorizontal: spacing.md,
    },
    floatingPlaceholderColor: colors.muted,
  });
}
