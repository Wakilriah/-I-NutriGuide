import { Link } from "expo-router";
import { ImageBackground, Text, View } from "react-native";
import { ButtonLink } from "../src/components/ButtonLink";
import { GuestRoute } from "../src/components/GuestRoute";
import { Screen } from "../src/components/Screen";
import { Badge, FoodCard, PageHeader } from "../src/components/ui";
import { colors, images, radii, spacing } from "../src/theme/design";

export default function WelcomeScreen() {
  return (
    <GuestRoute>
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", gap: spacing.lg }}>
          <ImageBackground imageStyle={{ borderRadius: radii.xl }} source={{ uri: images.bowls }} style={{ minHeight: 390, overflow: "hidden", borderRadius: radii.xl }}>
            <View style={{ flex: 1, justifyContent: "flex-end", gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.overlay }}>
              <Badge label="Smart Food Match" tone="orange" />
              <Text style={{ color: colors.surface, fontSize: 16, fontWeight: "900" }}>I-NutriGuide</Text>
              <Text style={{ color: colors.surface, fontSize: 48, fontWeight: "900", lineHeight: 52 }}>Eat Healthy</Text>
              <Text style={{ color: colors.surfaceOnDark, fontSize: 17, lineHeight: 25 }}>
                Find the best foods to take with your supplements
              </Text>
            </View>
          </ImageBackground>

          <PageHeader
            eyebrow="Healthy guidance"
            title="Personalized meals that fit your supplement routine"
            subtitle="Build a profile, add supplements, and get clear nutrient synergy explanations with allergy and preference filters."
          />

          <FoodCard category="Vitamin C rich" name="Kiwi, citrus and leafy greens" reason="Helps absorption of iron and supports immunity-focused routines." score={0.94} />

          <View style={{ gap: 10 }}>
            <ButtonLink href="/auth/login" label="Get Started" />
            <Link href="/auth/login" style={{ color: colors.primary, fontSize: 15, fontWeight: "800", textAlign: "center" }}>
              Sign in
            </Link>
            <Link href="/auth/register" style={{ color: colors.primary, fontSize: 15, fontWeight: "800", textAlign: "center" }}>
              Create an account
            </Link>
          </View>
        </View>
      </Screen>
    </GuestRoute>
  );
}
