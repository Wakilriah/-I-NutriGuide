import { apiClient } from "./client";
import type { ListParams, PaginatedResponse } from "./types";

export type SupplementNutrient = {
  name: string;
  slug: string;
  amount: string | null;
  unit: string;
};

export type Supplement = {
  id: number;
  name: string;
  slug: string;
  description: string;
  common_dose: string;
  is_active: boolean;
  nutrients: SupplementNutrient[];
  created_at: string;
  updated_at: string;
};

export type SupplementPayload = {
  name: string;
  description: string;
  common_dose: string;
  is_active: boolean;
  nutrient_items: Array<{
    nutrient_slug: string;
    amount?: string | null;
    unit?: string;
  }>;
};

export type SupplementListParams = ListParams & {
  is_active?: "true" | "false";
};

export async function fetchSupplements(params: SupplementListParams = {}) {
  const response = await apiClient.get<Supplement[] | PaginatedResponse<Supplement>>("/supplements/", { params });
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results;
}

export async function fetchPaginatedSupplements(params: SupplementListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Supplement>>("/supplements/", { params });
  return response.data;
}

export async function createSupplement(payload: SupplementPayload) {
  const response = await apiClient.post<Supplement>("/supplements/", payload);
  return response.data;
}

export async function updateSupplement(slug: string, payload: SupplementPayload) {
  const response = await apiClient.patch<Supplement>(`/supplements/${slug}/`, payload);
  return response.data;
}

export async function deleteSupplement(slug: string) {
  await apiClient.delete(`/supplements/${slug}/`);
}
