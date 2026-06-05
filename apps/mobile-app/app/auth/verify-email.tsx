import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { AppButton, AppInput, AuthBackgroundScreen, AuthGlassCard, Badge, PageHeader } from "../../src/components/ui";
import { getAuthErrorMessage } from "../../src/features/auth/errors";
import { resendVerification, verifyEmail } from "../../src/features/auth/api";
import { verifyEmailSchema, type VerifyEmailValues } from "../../src/features/auth/schemas";
import { useAuthStore } from "../../src/stores/auth-store";
import { colors, radii, spacing } from "../../src/theme/design";

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === "string" ? params.email : "";
  const setSession = useAuthStore((state) => state.setSession);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setError,
  } = useForm<VerifyEmailValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { code: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const session = await verifyEmail({ email, code: values.code.trim() });
      await setSession(session);
      useAuthStore.getState().setProfileComplete(false);
      router.replace("/onboarding/profile");
    } catch (error) {
      setError("code", { message: getAuthErrorMessage(error, "The verification code is invalid or expired.") });
    }
  });

  const onResend = async () => {
    setIsResending(true);
    setResendMessage(null);
    try {
      const response = await resendVerification({ email });
      setResendMessage(response.detail);
    } catch (error) {
      setResendMessage(getAuthErrorMessage(error, "Unable to send another code right now."));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthBackgroundScreen>
      <AuthGlassCard style={{ alignSelf: "center", width: "100%", maxWidth: 430, gap: spacing.lg, padding: spacing.xl }}>
        <View style={{ alignItems: "center", gap: spacing.sm }}>
          <View style={{ width: 64, height: 64, alignItems: "center", justifyContent: "center", borderRadius: radii.hero, backgroundColor: colors.primary }}>
            <Ionicons color={colors.surface} name="mail" size={32} />
          </View>
          <Text style={{ color: colors.primary, fontSize: 28, fontWeight: "900" }}>Verify email</Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Badge label="Check your inbox" tone="orange" />
          <PageHeader title="Enter your code" subtitle={`We sent a 6-digit verification code to ${email || "your email"}.`} />
        </View>

        <View style={{ gap: spacing.md }}>
          <Controller
            control={control}
            name="code"
            render={({ field: { onChange, value } }) => (
              <AppInput
                accessibilityLabel="Verification code"
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.code?.message}
                keyboardType="number-pad"
                label="Verification code"
                maxLength={6}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          <AppButton accessibilityLabel="Verify email" disabled={isSubmitting || !email} icon="checkmark-circle" label={isSubmitting ? "Verifying" : "Verify email"} onPress={onSubmit} />
          <AppButton accessibilityLabel="Resend verification code" disabled={isResending || !email} icon="refresh" label={isResending ? "Sending" : "Resend code"} onPress={onResend} variant="secondary" />
          {resendMessage ? <Text style={{ color: colors.primary, fontWeight: "800", lineHeight: 20, textAlign: "center" }}>{resendMessage}</Text> : null}
        </View>

        <AppButton accessibilityLabel="Back to sign in" icon="log-in" label="Back to sign in" onPress={() => router.replace("/auth/login")} variant="ghost" />
      </AuthGlassCard>
    </AuthBackgroundScreen>
  );
}
