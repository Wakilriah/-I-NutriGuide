import { apiClient } from "../../lib/api";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  is_staff: boolean;
};

export type AuthSession = {
  access: string;
  refresh: string;
  user: AuthUser;
};

export async function login(payload: { email: string; password: string }) {
  const tokenResponse = await apiClient.post<{ access: string; refresh: string }>("/auth/login/", payload);
  const userResponse = await apiClient.get<AuthUser>("/auth/me/", {
    headers: { Authorization: `Bearer ${tokenResponse.data.access}` },
  });
  return { ...tokenResponse.data, user: userResponse.data };
}

export async function register(payload: { email: string; password: string; name: string }) {
  const response = await apiClient.post<AuthSession>("/auth/register/", payload);
  return response.data;
}
