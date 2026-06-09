import * as WebBrowser from "expo-web-browser";
import { Text, View } from "react-native";
import { colors, spacing, typography } from "../src/theme/design";

WebBrowser.maybeCompleteAuthSession();

export default function OAuthRedirectScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.background }}>
      <Text style={[typography.title, { textAlign: "center" }]}>Completing Google sign-in...</Text>
      <Text style={[typography.body, { textAlign: "center", color: colors.muted }]}>You can close this window if it does not close automatically.</Text>
    </View>
  );
}
