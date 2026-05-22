import { apiClient } from "../../lib/api";

export type RecommendationItem = {
  id: number;
  recommendation_id?: number;
  run_id: string;
  rank: number;
  food: { id: number; name: string; slug: string; category: string; nutrients?: string[] };
  matched_supplement: { id: number; name: string; slug: string } | null;
  score: string | number;
  confidence_score?: number;
  confidence_label?: string;
  score_breakdown?: Record<string, number>;
  nutrient_score: string | number;
  rule_score: string | number;
  preference_score: string | number;
  matched_nutrients: string[];
  tags: string[];
  warnings: RecommendationWarning[];
  explanation: RecommendationExplanation | string;
  feedback?: {
    user_feedback: null | {
      id: number;
      feedback_type: FeedbackType;
      rating?: number | null;
      comment?: string;
    };
    available_actions: FeedbackType[];
  };
};

export type RecommendationReason = {
  type: string;
  title: string;
  message: string;
  confidence: number;
};

export type RecommendationExplanation = {
  summary: string;
  reasons: RecommendationReason[];
};

export type RecommendationWarning = string | {
  level: "info" | "caution" | "warning";
  type: string;
  title: string;
  message: string;
  related_items?: string[];
};

export type RecommendationRun = {
  run_id: string;
  created_at: string;
  disclaimer: string;
  items: RecommendationItem[];
};

export type SavedRecommendationItem = {
  id: number;
  recommendation_item: RecommendationItem;
  created_at: string;
};

export type FeedbackType =
  | "liked"
  | "disliked"
  | "saved"
  | "tried"
  | "not_interested"
  | "unsafe_for_me"
  | "too_expensive"
  | "bad_taste"
  | "allergy_issue"
  | "helpful"
  | "not_helpful";

export type FeedbackPayload = {
  recommendation_item_id: number;
  food_id?: number;
  feedback_type: FeedbackType;
  rating?: number;
  is_helpful?: boolean;
  comment?: string;
  context?: Record<string, unknown>;
};

export async function generateRecommendations(limit = 10) {
  const response = await apiClient.post<RecommendationRun>("/recommendations/generate/", { limit });
  return response.data;
}

export async function listRecommendationHistory() {
  const response = await apiClient.get<RecommendationRun[]>("/recommendations/history/");
  return response.data;
}

export async function getRecommendationRun(runId: string) {
  const response = await apiClient.get<RecommendationRun>(`/recommendations/history/${runId}/`);
  return response.data;
}

export async function submitRecommendationFeedback(payload: FeedbackPayload) {
  const response = await apiClient.post("/recommendations/feedback/", payload);
  return response.data;
}

export async function saveRecommendationItem(recommendationItemId: number) {
  const response = await apiClient.post("/recommendations/saved-foods/", {
    recommendation_item_id: recommendationItemId,
  });
  return response.data;
}

export async function listSavedRecommendationItems() {
  const response = await apiClient.get<SavedRecommendationItem[]>("/recommendations/saved-foods/");
  return response.data;
}

export async function removeSavedRecommendationItem(savedItemId: number) {
  await apiClient.delete(`/recommendations/saved-foods/${savedItemId}/`);
}
