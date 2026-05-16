import { apiClient } from "./client";
import type { ListParams, PaginatedResponse } from "./types";

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  is_staff: boolean;
  is_active: boolean;
  date_joined: string;
  profile: null | {
    age: number | null;
    country: string;
    gender: string;
    bmi: string | null;
    sports_days_per_week: number | null;
    goal: string;
    goals: string[];
    health_conditions: string[];
    activity_level: string;
    diet_type: string;
    allergies: string[];
    dietary_restrictions: string[];
    disliked_foods: string[];
  };
  supplement_count: number;
  recommendation_count: number;
  feedback_count: number;
};

export type AdminUserSupplement = {
  id: number;
  name: string;
  slug: string;
  dose: string;
  frequency: string;
  time_of_day: string;
  active: boolean;
  created_at: string;
};

export type AdminUserRecommendation = {
  run_id: string;
  created_at: string;
  item_count: number;
  top_food: string;
  top_score: number | null;
};

export type AdminUserFeedback = {
  id: number;
  rating: number;
  is_helpful: boolean;
  comment: string;
  created_at: string;
  food: string;
  run_id: string;
};

export type AdminUserDetail = AdminUser & {
  supplements: AdminUserSupplement[];
  recent_recommendations: AdminUserRecommendation[];
  recent_feedback: AdminUserFeedback[];
};

export type AdminUserPayload = {
  email: string;
  name: string;
  password?: string;
  is_staff: boolean;
  is_active: boolean;
  profile?: {
    age?: number | null;
    gender?: string;
    goal?: string;
    activity_level?: string;
    diet_type?: string;
    allergies?: string[];
    dietary_restrictions?: string[];
    disliked_foods?: string[];
  };
};

export type AdminUserListParams = ListParams & {
  is_active?: "true" | "false";
  role?: "admin" | "user";
};

export async function fetchAdminUsers(params: AdminUserListParams = {}) {
  const response = await apiClient.get<AdminUser[] | PaginatedResponse<AdminUser>>("/admin/users/", { params });
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results;
}

export async function fetchPaginatedAdminUsers(params: AdminUserListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<AdminUser>>("/admin/users/", { params });
  return response.data;
}

export async function fetchAdminUser(id: number) {
  const response = await apiClient.get<AdminUserDetail>(`/admin/users/${id}/`);
  return response.data;
}

export async function createAdminUser(payload: AdminUserPayload) {
  const response = await apiClient.post<AdminUser>("/admin/users/", payload);
  return response.data;
}

export async function updateAdminUser(id: number, payload: Partial<AdminUserPayload>) {
  const response = await apiClient.patch<AdminUser>(`/admin/users/${id}/`, payload);
  return response.data;
}

export async function deleteAdminUser(id: number) {
  await apiClient.delete(`/admin/users/${id}/`);
}
