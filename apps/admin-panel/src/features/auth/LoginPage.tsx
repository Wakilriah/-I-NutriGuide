import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { loginAdmin } from "../../api/auth";
import { useAuthStore } from "../../store/auth-store";
import { loginSchema, type LoginFormValues } from "./schemas";

const LOGIN_FAILED_MESSAGE = "Please verify your email and password and try again.";

export function LoginPage() {
  const setSession = useAuthStore((state) => state.setSession);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
    reValidateMode: "onBlur",
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const session = await loginAdmin(values.email, values.password);
      setSession(session);
    } catch {
      setError(LOGIN_FAILED_MESSAGE);
    }
  });

  return (
    <main className="login-shell">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-copy">
          <p className="eyebrow">I-NutriGuide Admin</p>
          <h1 id="login-title">Operations workspace</h1>
          <p>Sign in to manage nutrition data, review recommendations, and monitor feedback.</p>
        </div>

        <form className="login-form" onSubmit={onSubmit}>
          <label>
            <span>Email</span>
            <div className="input-row">
              <Mail aria-hidden="true" size={18} />
              <input autoComplete="email" type="email" {...register("email")} />
            </div>
            {errors.email ? <small>{errors.email.message}</small> : null}
          </label>

          <label>
            <span>Password</span>
            <div className="input-row">
              <LockKeyhole aria-hidden="true" size={18} />
              <input autoComplete="current-password" type={showPassword ? "text" : "password"} {...register("password")} />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
              </button>
            </div>
            {errors.password ? <small>{errors.password.message}</small> : null}
          </label>

          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
