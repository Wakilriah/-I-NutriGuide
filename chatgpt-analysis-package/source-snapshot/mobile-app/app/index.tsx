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
          <View style={{ flex: 1, justifyContent: "flex-end", padding: spacing.md, backgroundColor: "rgba(0,0,0,0.16)" }}>
            <View
              style={{
                alignItems: "center",
                gap: spacing.md,
                borderColor: "rgba(255,255,255,0.5)",
                borderRadius: radii.hero,
                borderWidth: 1,
                backgroundColor: "rgba(255,255,255,0.76)",
                padding: spacing.lg,
                shadowColor: colors.primaryContainer,
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.16,
                shadowRadius: 32,
                elevation: 5,
              }}
            >
              <View style={{ width: 58, height: 58, alignItems: "center", justifyContent: "center", borderRadius: radii.lg, backgroundColor: colors.primary }}>
                <Ionicons color={colors.surface} name="nutrition" size={30} />
              </View>
              <View style={{ alignItems: "center", gap: spacing.xs }}>
                <Text style={{ color: colors.primary, fontSize: 24, fontWeight: "900" }}>I-NutriGuide</Text>
                <Text style={{ color: colors.muted, textAlign: "center" }}>Smart Nutrition, Personalized for You.</Text>
              </View>
              <View style={{ alignItems: "center", gap: spacing.xs }}>
                <Badge label="Smart Food Match" tone="orange" />
                <Text style={{ color: colors.text, fontSize: 28, fontWeight: "900", lineHeight: 34, textAlign: "center" }}>
                  Eat Smarter,{"\n"}<Text style={{ color: colors.primary }}>Live Better.</Text>
                </Text>
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
