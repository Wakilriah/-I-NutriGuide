import { apiClient } from "./client";

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  is_staff: boolean;
};

export type LoginResponse = {
  access: string;
  refresh: string;
};

export async function loginAdmin(email: string, password: string) {
  const tokenResponse = await apiClient.post<LoginResponse>("/auth/login/", { email, password });
  const accessToken = tokenResponse.data.access;
  const userResponse = await apiClient.get<AdminUser>("/auth/me/", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userResponse.data.is_staff) {
    throw new Error("This account does not have admin access.");
  }

  return { ...tokenResponse.data, user: userResponse.data };
}

