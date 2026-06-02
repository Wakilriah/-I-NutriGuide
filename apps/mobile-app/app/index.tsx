import { Link } from "expo-router";
import { Image, Text, View } from "react-native";
import { ButtonLink } from "../src/components/ButtonLink";
import { GuestRoute } from "../src/components/GuestRoute";
import { AuthBackgroundScreen } from "../src/components/ui";
import { colors, radii, spacing } from "../src/theme/design";

export default function WelcomeScreen() {
  return (
    <GuestRoute>
      <AuthBackgroundScreen contentStyle={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.xl }} justifyContent="center">
        <View style={{ flex: 1, justifyContent: "center", gap: spacing.xl }}>
          <View style={{ alignItems: "center", gap: spacing.lg }}>
            <View style={styles.logoShell}>
              <Image source={require("../assets/icon.png")} style={{ width: 104, height: 104, borderRadius: radii.pill }} />
            </View>
            <View style={{ alignItems: "center", gap: spacing.sm }}>
              <Text style={styles.title}>I-NutriGuide</Text>
              <Text style={styles.subtitle}>Smart food recommendations for your supplements</Text>
            </View>
          </View>

          <View style={{ gap: spacing.md }}>
            <ButtonLink href="/auth/login" label="Get Started  ->" />
            <Link href="/auth/register" style={styles.glassLink}>
              Create a new account
            </Link>
          </View>

          <Text style={styles.footer}>YOUR PERSONAL WELLNESS PARTNER</Text>
        </View>
      </AuthBackgroundScreen>
    </GuestRoute>
  );
}

const styles = {
  logoShell: {
    width: 132,
    height: 132,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 6,
  },
  title: {
    color: colors.surface,
    fontSize: 38,
    fontWeight: "900" as const,
    lineHeight: 46,
    textAlign: "center" as const,
  },
  subtitle: {
    maxWidth: 320,
    color: colors.surface,
    fontSize: 22,
    fontWeight: "700" as const,
    lineHeight: 30,
    textAlign: "center" as const,
  },
  glassLink: {
    minHeight: 58,
    overflow: "hidden" as const,
    borderColor: "rgba(255,255,255,0.42)",
    borderRadius: radii.pill,
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.18)",
    color: colors.surface,
    fontSize: 16,
    fontWeight: "900" as const,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    textAlign: "center" as const,
  },
  footer: {
    color: "rgba(255,255,255,0.64)",
    fontSize: 13,
    fontWeight: "900" as const,
    letterSpacing: 2,
    textAlign: "center" as const,
  },
};
