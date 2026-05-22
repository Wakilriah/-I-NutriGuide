import { apiClient } from "./client";
import type { ListParams, PaginatedResponse } from "./types";

export type RecommendationItem = {
  id: number;
  rank: number;
  food: {
    id: number;
    name: string;
    slug: string;
    category: string;
    nutrients?: string[];
  };
  matched_supplement: null | {
    id: number;
    name: string;
    slug: string;
  };
  score: number;
  confidence_score?: number;
  confidence_label?: string;
  score_breakdown?: Record<string, number>;
  nutrient_score: number;
  rule_score: number;
  preference_score: number;
  matched_nutrients: string[];
  matched_rules: Array<{
    id?: number;
    antecedent?: string;
    consequent?: string;
    explanation?: string;
  }>;
  tags: string[];
  warnings: Array<string | {
    level: "info" | "caution" | "warning";
    type: string;
    title: string;
    message: string;
    related_items?: string[];
  }>;
  explanation: string | {
    summary: string;
    reasons?: Array<{
      type: string;
      title: string;
      message: string;
      confidence: number;
    }>;
  };
  feedback?: {
    user_feedback: null | {
      id: number;
      feedback_type: string;
      rating?: number | null;
      comment?: string;
    };
    available_actions: string[];
  };
};

export type AdminRecommendationRun = {
  run_id: string;
  user: {
    id: number;
    email: string;
    name: string;
  };
  created_at: string;
  disclaimer: string;
  items: RecommendationItem[];
};

export type RecommendationRunListParams = ListParams & {
  user_id?: number;
  supplement?: string;
  date_from?: string;
  date_to?: string;
};

export async function fetchAdminRecommendationRuns(params: RecommendationRunListParams = {}) {
  const response = await apiClient.get<AdminRecommendationRun[] | PaginatedResponse<AdminRecommendationRun>>("/admin/recommendations/", { params });
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results;
}

export async function fetchPaginatedAdminRecommendationRuns(params: RecommendationRunListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<AdminRecommendationRun>>("/admin/recommendations/", { params });
  return response.data;
}

export async function fetchAdminRecommendationRun(runId: string) {
  const response = await apiClient.get<AdminRecommendationRun>(`/admin/recommendations/${runId}/`);
  return response.data;
}
