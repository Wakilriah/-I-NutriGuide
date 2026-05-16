import { apiClient } from "./client";
import type { ListParams, PaginatedResponse } from "./types";

export type Nutrient = {
  id: number;
  name: string;
  slug: string;
  unit: string;
  description: string;
  created_at: string;
  updated_at: string;
};

export type NutrientPayload = {
  name: string;
  unit: string;
  description: string;
};

export async function fetchNutrients(params: ListParams = {}) {
  const response = await apiClient.get<Nutrient[] | PaginatedResponse<Nutrient>>("/admin/nutrients/", { params });
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results;
}

export async function fetchPaginatedNutrients(params: ListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Nutrient>>("/admin/nutrients/", { params });
  return response.data;
}

export async function createNutrient(payload: NutrientPayload) {
  const response = await apiClient.post<Nutrient>("/admin/nutrients/", payload);
  return response.data;
}

export async function updateNutrient(slug: string, payload: NutrientPayload) {
  const response = await apiClient.patch<Nutrient>(`/admin/nutrients/${slug}/`, payload);
  return response.data;
}

export async function deleteNutrient(slug: string) {
  await apiClient.delete(`/admin/nutrients/${slug}/`);
}
