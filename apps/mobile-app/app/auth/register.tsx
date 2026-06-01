import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { AppButton, AppInput, AuthBackgroundScreen, AuthGlassCard, Badge, PageHeader } from "../../src/components/ui";
import { register } from "../../src/features/auth/api";
import { getAuthErrorMessage } from "../../src/features/auth/errors";
import { registerSchema, type RegisterValues } from "../../src/features/auth/schemas";
import { useAuthStore } from "../../src/stores/auth-store";
import { colors, radii, spacing } from "../../src/theme/design";

export default function RegisterScreen() {
  const setSession = useAuthStore((state) => state.setSession);
  const [showPasswords, setShowPasswords] = useState(false);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setError,
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", password2: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const session = await register({
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      password: values.password,
    }).catch((error) => {
      setError("email", { message: getAuthErrorMessage(error, "Unable to create this account.") });
      return null;
    });

    if (!session) {
      return;
    }

    try {
      await setSession(session);
      useAuthStore.getState().setProfileComplete(false);
      router.replace("/onboarding/profile");
    } catch (error) {
      setError("email", { message: "Account created, but the app could not start your session. Please sign in." });
    }
  });

  return (
    <AuthBackgroundScreen>
      <AuthGlassCard style={{ alignSelf: "center", width: "100%", maxWidth: 430, gap: spacing.lg, padding: spacing.xl }}>
        <View style={{ alignItems: "center", gap: spacing.sm }}>
          <View style={{ width: 64, height: 64, alignItems: "center", justifyContent: "center", borderRadius: radii.hero, backgroundColor: colors.primary }}>
            <Ionicons color={colors.surface} name="nutrition" size={32} />
          </View>
          <Text style={{ color: colors.primary, fontSize: 28, fontWeight: "900" }}>I-NutriGuide</Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          <Badge label="Start healthy" tone="orange" />
          <PageHeader title="Create account" subtitle="Set up your nutrition profile and get supplement-aware food recommendations." />
        </View>
        <View style={{ gap: spacing.md }}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <AppInput accessibilityLabel="name" autoCapitalize="words" autoCorrect={false} error={errors.name?.message} label="Full name" onChangeText={onChange} value={value} />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <AppInput
                accessibilityLabel="email"
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.email?.message}
                keyboardType="email-address"
                label="email"
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <AppInput accessibilityLabel="password" autoCorrect={false} error={errors.password?.message} label="password" onChangeText={onChange} secureTextEntry={!showPasswords} value={value} />
            )}
          />
          <Controller
            control={control}
            name="password2"
            render={({ field: { onChange, value } }) => (
              <AppInput
                accessibilityLabel="password2"
                autoCorrect={false}
                error={errors.password2?.message}
                label="Confirm password"
                onChangeText={onChange}
                secureTextEntry={!showPasswords}
                value={value}
              />
            )}
          />
          <AppButton
            accessibilityLabel={showPasswords ? "Hide passwords" : "Show passwords"}
            icon={showPasswords ? "eye-off" : "eye"}
            label={showPasswords ? "Hide passwords" : "Show passwords"}
            onPress={() => setShowPasswords((current) => !current)}
            variant="secondary"
          />
          <AppButton accessibilityLabel="Submit registration" disabled={isSubmitting} icon="person-add" label={isSubmitting ? "Creating" : "Create account"} onPress={onSubmit} />
        </View>
        <Link href="/auth/login" style={{ color: colors.primary, fontWeight: "800", textAlign: "center" }}>
          Already have an account? Sign in
        </Link>
      </AuthGlassCard>
    </AuthBackgroundScreen>
  );
}
