import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { AppButton, AppInput, AuthBackgroundScreen, AuthGlassCard, Badge, PageHeader } from "../../src/components/ui";
import { requestPasswordReset } from "../../src/features/auth/api";
import { getAuthErrorMessage } from "../../src/features/auth/errors";
import { forgotPasswordSchema, type ForgotPasswordValues } from "../../src/features/auth/schemas";
import { colors, radii, spacing } from "../../src/theme/design";

export default function ForgotPasswordScreen() {
  const [message, setMessage] = useState<string | null>(null);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setError,
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const email = values.email.trim().toLowerCase();
    try {
      const response = await requestPasswordReset({ email });
      setMessage(response.detail);
      router.push({ pathname: "/auth/reset-password", params: { email } } as never);
    } catch (error) {
      setError("email", { message: getAuthErrorMessage(error, "Unable to send a reset code right now.") });
    }
  });

  return (
    <AuthBackgroundScreen>
      <AuthGlassCard style={{ alignSelf: "center", width: "100%", maxWidth: 430, gap: spacing.lg, padding: spacing.xl }}>
        <View style={{ alignItems: "center", gap: spacing.sm }}>
          <View style={{ width: 64, height: 64, alignItems: "center", justifyContent: "center", borderRadius: radii.hero, backgroundColor: colors.primary }}>
            <Ionicons color={colors.surface} name="key" size={32} />
          </View>
          <Text style={{ color: colors.primary, fontSize: 28, fontWeight: "900" }}>Reset password</Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Badge label="Account recovery" tone="orange" />
          <PageHeader title="Get a reset code" subtitle="Enter your email and we will send a six-digit code if the account exists." />
        </View>

        <View style={{ gap: spacing.md }}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <AppInput accessibilityLabel="Reset email" autoCapitalize="none" autoCorrect={false} error={errors.email?.message} keyboardType="email-address" label="Email" onChangeText={onChange} value={value} />
            )}
          />
          <AppButton accessibilityLabel="Send password reset code" disabled={isSubmitting} icon="mail" label={isSubmitting ? "Sending" : "Send reset code"} onPress={onSubmit} />
          {message ? <Text style={{ color: colors.primary, fontWeight: "800", lineHeight: 20, textAlign: "center" }}>{message}</Text> : null}
        </View>

        <AppButton accessibilityLabel="Back to sign in" icon="log-in" label="Back to sign in" onPress={() => router.replace("/auth/login")} variant="ghost" />
      </AuthGlassCard>
    </AuthBackgroundScreen>
  );
}
