import { apiClient } from "./client";
import type { ListParams, PaginatedResponse } from "./types";

export type SupplementCategory = {
  id: number;
  category: string;
  canonical_item: string;
  association_item: string;
  keywords: string[];
  main_nutrient: string;
  source_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SupplementNormalization = {
  id: number;
  original_supplement_name: string;
  original_supplement_slug: string;
  normalized_category: string;
  canonical_item?: string;
  primary_keyword: string;
  main_nutrient: string;
  notes: string;
  source_url: string;
  is_active: boolean;
};

export type SynergySeedRule = {
  id: number;
  rule_seed_id: string;
  supplement_category_name: string;
  supplement_item: string;
  food: string;
  food_item: string;
  nutrient_relation: string;
  association_type: string;
  reason: string;
  seed_weight: number;
  source_url: string;
  is_active: boolean;
};

export type SafetyConstraint = {
  id: number;
  supplement_category_name: string;
  avoid_or_review_item: string;
  constraint_type: string;
  safety_level: "LOW" | "MEDIUM" | "HIGH";
  reason: string;
  how_to_use: string;
  source_url: string;
  is_active: boolean;
};

export type MinedAssociationRule = {
  id: number;
  antecedent_items: string[];
  consequent_items: string[];
  support: number;
  confidence: number;
  lift: number;
  rule_type: string;
  review_status: "pending" | "approved" | "rejected" | "needs_review";
  admin_note: string;
  safety_conflict_status: string;
  safety_conflict_details: Array<{ message: string; safety_level: string; matched: string }>;
  source: string;
  explanation: string;
  is_active: boolean;
};

export type AssociationTransaction = {
  id: number;
  transaction_id: string;
  source: string;
  raw_payload: Record<string, unknown>;
  one_hot_items: string[];
  item_count: number;
  items: Array<{ id: number; item_type: string; item_value: string; item: string }>;
};

type RuleListParams = ListParams & {
  supplement?: string;
  food?: string;
  association_type?: string;
  constraint_type?: string;
  rule_type?: string;
  min_confidence?: string;
  min_lift?: string;
  is_active?: "true" | "false";
  item?: string;
  item_type?: string;
  category?: string;
};

export async function fetchSupplementCategories(params: ListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<SupplementCategory>>("/admin/association-supplement-categories/", { params });
  return response.data;
}

export async function fetchSupplementNormalizations(params: RuleListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<SupplementNormalization>>("/admin/supplement-normalizations/", { params });
  return response.data;
}

export async function fetchSynergySeedRules(params: RuleListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<SynergySeedRule>>("/admin/synergy-seed-rules/", { params });
  return response.data;
}

export async function updateSynergySeedRule(id: number, payload: Partial<SynergySeedRule>) {
  const response = await apiClient.patch<SynergySeedRule>(`/admin/synergy-seed-rules/${id}/`, payload);
  return response.data;
}

export async function fetchSafetyConstraints(params: RuleListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<SafetyConstraint>>("/admin/safety-constraints/", { params });
  return response.data;
}

export async function updateSafetyConstraint(id: number, payload: Partial<SafetyConstraint>) {
  const response = await apiClient.patch<SafetyConstraint>(`/admin/safety-constraints/${id}/`, payload);
  return response.data;
}

export async function fetchMinedAssociationRules(params: RuleListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<MinedAssociationRule>>("/admin/mined-association-rules/", { params });
  return response.data;
}

export async function updateMinedAssociationRule(id: number, payload: Partial<MinedAssociationRule>) {
  const response = await apiClient.patch<MinedAssociationRule>(`/admin/mined-association-rules/${id}/`, payload);
  return response.data;
}

export async function fetchAssociationTransactions(params: RuleListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<AssociationTransaction>>("/admin/association-transactions/", { params });
  return response.data;
}
