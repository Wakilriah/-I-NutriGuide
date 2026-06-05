import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { AppButton, AppInput, AuthBackgroundScreen, AuthGlassCard, Badge, PageHeader } from "../../src/components/ui";
import { confirmPasswordReset, requestPasswordReset } from "../../src/features/auth/api";
import { getAuthErrorMessage } from "../../src/features/auth/errors";
import { resetPasswordSchema, type ResetPasswordValues } from "../../src/features/auth/schemas";
import { colors, radii, spacing } from "../../src/theme/design";

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string; code?: string }>();
  const email = typeof params.email === "string" ? params.email : "";
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setError,
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: typeof params.code === "string" ? params.code : "", password: "", password2: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await confirmPasswordReset({ email, code: values.code.trim(), password: values.password });
      setMessage(response.detail);
      router.replace("/auth/login");
    } catch (error) {
      setError("code", { message: getAuthErrorMessage(error, "The reset code is invalid or expired.") });
    }
  });

  const onResend = async () => {
    setIsResending(true);
    setMessage(null);
    try {
      const response = await requestPasswordReset({ email });
      setMessage(response.detail);
    } catch (error) {
      setMessage(getAuthErrorMessage(error, "Unable to send another reset code right now."));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthBackgroundScreen>
      <AuthGlassCard style={{ alignSelf: "center", width: "100%", maxWidth: 430, gap: spacing.lg, padding: spacing.xl }}>
        <View style={{ alignItems: "center", gap: spacing.sm }}>
          <View style={{ width: 64, height: 64, alignItems: "center", justifyContent: "center", borderRadius: radii.hero, backgroundColor: colors.primary }}>
            <Ionicons color={colors.surface} name="lock-open" size={32} />
          </View>
          <Text style={{ color: colors.primary, fontSize: 28, fontWeight: "900" }}>New password</Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Badge label="Check your inbox" tone="orange" />
          <PageHeader title="Enter reset code" subtitle={`Use the 6-digit code sent to ${email || "your email"}.`} />
        </View>

        <View style={{ gap: spacing.md }}>
          <Controller
            control={control}
            name="code"
            render={({ field: { onChange, value } }) => (
              <AppInput accessibilityLabel="Password reset code" autoCapitalize="none" autoCorrect={false} error={errors.code?.message} keyboardType="number-pad" label="Reset code" maxLength={6} onChangeText={onChange} value={value} />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <AppInput accessibilityLabel="New password" autoCorrect={false} error={errors.password?.message} label="New password" onChangeText={onChange} secureTextEntry={!showPasswords} value={value} />
            )}
          />
          <Controller
            control={control}
            name="password2"
            render={({ field: { onChange, value } }) => (
              <AppInput accessibilityLabel="Confirm new password" autoCorrect={false} error={errors.password2?.message} label="Confirm password" onChangeText={onChange} secureTextEntry={!showPasswords} value={value} />
            )}
          />
          <AppButton accessibilityLabel={showPasswords ? "Hide new passwords" : "Show new passwords"} icon={showPasswords ? "eye-off" : "eye"} label={showPasswords ? "Hide passwords" : "Show passwords"} onPress={() => setShowPasswords((current) => !current)} variant="secondary" />
          <AppButton accessibilityLabel="Reset password" disabled={isSubmitting || !email} icon="checkmark-circle" label={isSubmitting ? "Resetting" : "Reset password"} onPress={onSubmit} />
          <AppButton accessibilityLabel="Resend password reset code" disabled={isResending || !email} icon="refresh" label={isResending ? "Sending" : "Resend code"} onPress={onResend} variant="secondary" />
          {message ? <Text style={{ color: colors.primary, fontWeight: "800", lineHeight: 20, textAlign: "center" }}>{message}</Text> : null}
        </View>

        <AppButton accessibilityLabel="Back to sign in" icon="log-in" label="Back to sign in" onPress={() => router.replace("/auth/login")} variant="ghost" />
      </AuthGlassCard>
    </AuthBackgroundScreen>
  );
}
