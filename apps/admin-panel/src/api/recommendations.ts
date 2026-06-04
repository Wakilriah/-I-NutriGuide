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

export type EvaluationMetrics = {
  precision_at_k: number;
  recall_at_k: number;
  ndcg: number;
  coverage: number;
  diversity: number;
  average_confidence: number;
  rule_hit_rate: number;
  safety_violation_rate: number;
  user_save_rate: number;
  user_dislike_rate: number;
  recommendation_acceptance_rate: number;
  counts: Record<string, number>;
  high_risk_issues: Array<{ type: string; message: string }>;
};

export type KnowledgeGraphPayload = {
  nodes: Array<{ id: string; label: string; type: string }>;
  edges: Array<{ source: string; target: string; type: string; label: string; level?: string }>;
};

export async function fetchEvaluationMetrics(params: { date_from?: string; date_to?: string; supplement?: string } = {}) {
  const response = await apiClient.get<EvaluationMetrics>("/admin/evaluation/", { params });
  return response.data;
}

export async function fetchKnowledgeGraph(params: { supplement?: string; nutrient?: string; food?: string; interaction_type?: string } = {}) {
  const response = await apiClient.get<KnowledgeGraphPayload>("/admin/knowledge-graph/", { params });
  return response.data;
}
