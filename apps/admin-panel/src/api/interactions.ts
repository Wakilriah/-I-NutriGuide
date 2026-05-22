import { apiClient } from "./client";
import type { PaginatedResponse } from "./types";

export type NutrientInteraction = {
  id: number;
  source_type: "supplement" | "nutrient" | "food";
  source_key: string;
  target_type: "supplement" | "nutrient" | "food";
  target_key: string;
  interaction_type: "enhances" | "inhibits" | "requires" | "should_not_combine" | "supports";
  mechanism: string;
  evidence_level: "low" | "medium" | "high";
  severity: "info" | "caution" | "warning";
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type InteractionListParams = {
  interaction_type?: string;
  severity?: string;
  search?: string;
};

export async function fetchNutrientInteractions(params: InteractionListParams = {}) {
  const response = await apiClient.get<NutrientInteraction[] | PaginatedResponse<NutrientInteraction>>("/nutrition/interactions/", { params });
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results;
}
