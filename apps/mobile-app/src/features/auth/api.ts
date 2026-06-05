import { apiClient } from "../../lib/api";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  is_staff: boolean;
  is_email_verified: boolean;
};

export type AuthSession = {
  access: string;
  refresh: string;
  user: AuthUser;
};

export type RegisterResponse = {
  user: AuthUser;
  verification_required: boolean;
  detail: string;
};

export async function login(payload: { email: string; password: string }) {
  const tokenResponse = await apiClient.post<{ access: string; refresh: string }>("/auth/login/", payload);
  const userResponse = await apiClient.get<AuthUser>("/auth/me/", {
    headers: { Authorization: `Bearer ${tokenResponse.data.access}` },
  });
  return { ...tokenResponse.data, user: userResponse.data };
}

export async function register(payload: { email: string; password: string; name: string }) {
  const response = await apiClient.post<RegisterResponse>("/auth/register/", payload);
  return response.data;
}

export async function verifyEmail(payload: { email: string; code: string }) {
  const response = await apiClient.post<AuthSession>("/auth/verify-email/", payload);
  return response.data;
}

export async function resendVerification(payload: { email: string }) {
  const response = await apiClient.post<{ detail: string }>("/auth/resend-verification/", payload);
  return response.data;
}

export async function loginWithGoogle(payload: { idToken: string }) {
  const response = await apiClient.post<AuthSession>("/auth/google/", { id_token: payload.idToken });
  return response.data;
}

export async function requestPasswordReset(payload: { email: string }) {
  const response = await apiClient.post<{ detail: string }>("/auth/password-reset/request/", payload);
  return response.data;
}

export async function confirmPasswordReset(payload: { email: string; code: string; password: string }) {
  const response = await apiClient.post<{ detail: string }>("/auth/password-reset/confirm/", payload);
  return response.data;
}
