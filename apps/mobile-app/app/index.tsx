import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { ImageBackground, Text, View } from "react-native";
import { ButtonLink } from "../src/components/ButtonLink";
import { GuestRoute } from "../src/components/GuestRoute";
import { Badge } from "../src/components/ui";
import { colors, images, radii, spacing } from "../src/theme/design";

export default function WelcomeScreen() {
  return (
    <GuestRoute>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ImageBackground source={{ uri: images.bowls }} style={{ flex: 1, justifyContent: "flex-end" }}>
          <View style={{ flex: 1, justifyContent: "flex-end", padding: spacing.md, backgroundColor: "rgba(0,0,0,0.22)" }}>
            <View
              style={{
                alignItems: "stretch",
                gap: spacing.md,
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
              }}
            >
              <View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.primary }}>
                <Ionicons color={colors.surface} name="nutrition" size={30} />
              </View>
              <View style={{ gap: spacing.xs }}>
                <Badge label="Smart Food Match" tone="orange" />
                <Text style={{ color: colors.text, fontSize: 30, fontWeight: "900", lineHeight: 36 }}>
                  I-NutriGuide
                </Text>
                <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 23 }}>Smart nutrition guidance built around your supplements, food preferences, and daily goals.</Text>
              </View>
              <View style={{ width: "100%", gap: 10 }}>
                <ButtonLink href="/auth/login" label="Get Started" />
                <Link href="/auth/login" style={{ color: colors.primary, fontSize: 15, fontWeight: "800", textAlign: "center" }}>
                  Sign in
                </Link>
                <Link href="/auth/register" style={{ color: colors.primary, fontSize: 15, fontWeight: "800", textAlign: "center" }}>
                  Create an account
                </Link>
              </View>
            </View>
          </View>
        </ImageBackground>
      </View>
    </GuestRoute>
  );
}
