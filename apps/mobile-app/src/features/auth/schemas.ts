import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email.")),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required."),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email.")),
    password: z.string().min(8, "Password must be at least 8 characters."),
    password2: z.string().min(8, "Confirm password must be at least 8 characters."),
  })
  .refine((values) => values.password === values.password2, {
    message: "Passwords must match.",
    path: ["password2"],
  });

export const verifyEmailSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email.")),
});

export const resetPasswordSchema = z
  .object({
    code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    password2: z.string().min(8, "Confirm password must be at least 8 characters."),
  })
  .refine((values) => values.password === values.password2, {
    message: "Passwords must match.",
    path: ["password2"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type VerifyEmailValues = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
