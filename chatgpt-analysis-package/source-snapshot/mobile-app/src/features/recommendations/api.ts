import { apiClient } from "../../lib/api";

export type RecommendationItem = {
  id: number;
  run_id: string;
  rank: number;
  food: { id: number; name: string; slug: string; category: string };
  matched_supplement: { id: number; name: string; slug: string } | null;
  score: string;
  nutrient_score: string;
  rule_score: string;
  preference_score: string;
  matched_nutrients: string[];
  tags: string[];
  warnings: string[];
  explanation: string;
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

export type FeedbackPayload = {
  recommendation_item_id: number;
  rating: number;
  is_helpful: boolean;
  comment: string;
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
  const response = await apiClient.post("/feedback/", payload);
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
