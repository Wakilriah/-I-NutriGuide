import { apiClient } from "./client";
import type { ListParams, PaginatedResponse } from "./types";

export type EntityType = "supplement" | "nutrient" | "food" | "category";

export type AssociationRule = {
  id: number;
  antecedent_type: EntityType;
  antecedent_slug: string;
  consequent_type: EntityType;
  consequent_slug: string;
  support: number;
  confidence: number;
  lift: number;
  explanation: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AssociationRulePayload = {
  antecedent_type: EntityType;
  antecedent_slug: string;
  consequent_type: EntityType;
  consequent_slug: string;
  support: number;
  confidence: number;
  lift: number;
  explanation: string;
  is_active: boolean;
};

export type AssociationRuleListParams = ListParams & {
  entity_type?: EntityType;
  is_active?: "true" | "false";
};

export async function fetchAssociationRules(params: AssociationRuleListParams = {}) {
  const response = await apiClient.get<AssociationRule[] | PaginatedResponse<AssociationRule>>("/admin/association-rules/", { params });
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results;
}

export async function fetchPaginatedAssociationRules(params: AssociationRuleListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<AssociationRule>>("/admin/association-rules/", { params });
  return response.data;
}

export async function createAssociationRule(payload: AssociationRulePayload) {
  const response = await apiClient.post<AssociationRule>("/admin/association-rules/", payload);
  return response.data;
}

export async function updateAssociationRule(id: number, payload: AssociationRulePayload) {
  const response = await apiClient.patch<AssociationRule>(`/admin/association-rules/${id}/`, payload);
  return response.data;
}

export async function deleteAssociationRule(id: number) {
  await apiClient.delete(`/admin/association-rules/${id}/`);
}
