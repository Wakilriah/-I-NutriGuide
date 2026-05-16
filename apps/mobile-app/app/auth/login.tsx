import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";
import { login } from "../../src/features/auth/api";
import { getAuthErrorMessage } from "../../src/features/auth/errors";
import { loginSchema, type LoginValues } from "../../src/features/auth/schemas";
import { getProfile, isProfileComplete } from "../../src/features/profile/api";
import { useAuthStore } from "../../src/stores/auth-store";
import { Screen } from "../../src/components/Screen";
import { AppButton, AppCard, AppInput, PageHeader } from "../../src/components/ui";
import { colors, spacing } from "../../src/theme/design";

const LOGIN_FAILED_MESSAGE = "Please verify your email and password and try again.";

export default function LoginScreen() {
  const setSession = useAuthStore((state) => state.setSession);
  const [showPassword, setShowPassword] = useState(false);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setError,
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
    reValidateMode: "onBlur",
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const session = await login({ email: values.email.trim().toLowerCase(), password: values.password });
      await setSession(session);
      const profile = await getProfile();
      const complete = isProfileComplete(profile);
      useAuthStore.getState().setProfileComplete(complete);
      router.replace(complete ? "/tabs/home" : "/onboarding/profile");
    } catch (error) {
      setError("password", { message: getAuthErrorMessage(error, LOGIN_FAILED_MESSAGE, { hideServerMessage: true }) });
    }
  });

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", gap: spacing.lg }}>
        <PageHeader eyebrow="Welcome back" title="Sign in" subtitle="Use your I-NutriGuide account to continue your food and supplement plan." />

        <AppCard style={{ gap: spacing.md }}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onBlur, onChange, value } }) => (
              <AppInput
                accessibilityLabel="Email"
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.email?.message}
                keyboardType="email-address"
                label="Email"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onBlur, onChange, value } }) => (
              <AppInput
                accessibilityLabel="Password"
                autoCorrect={false}
                error={errors.password?.message}
                label="Password"
                onBlur={onBlur}
                onChangeText={onChange}
                secureTextEntry={!showPassword}
                value={value}
              />
            )}
          />
          <AppButton
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            icon={showPassword ? "eye-off" : "eye"}
            label={showPassword ? "Hide password" : "Show password"}
            onPress={() => setShowPassword((current) => !current)}
            variant="secondary"
          />

          <AppButton accessibilityLabel="Submit login" disabled={isSubmitting} icon="log-in" label={isSubmitting ? "Signing in" : "Sign in"} onPress={onSubmit} />
        </AppCard>

        <Link href="/auth/register" style={{ color: colors.primary, fontWeight: "800", textAlign: "center" }}>
          Create an account
        </Link>
      </View>
    </Screen>
  );
}
