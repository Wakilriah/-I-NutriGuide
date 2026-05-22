import { apiClient } from "./client";
import type { ListParams, PaginatedResponse } from "./types";

export type RecommendationFeedback = {
  id: number;
  recommendation_item: {
    id: number;
    rank: number;
    run_id: string;
    food: {
      id: number;
      name: string;
      slug: string;
    };
  };
  user_email: string;
  rating: number;
  is_helpful: boolean;
  comment: string;
  created_at: string;
};

export type FeedbackListParams = ListParams & {
  rating?: number;
  is_helpful?: "true" | "false";
};

export async function fetchFeedback(params: FeedbackListParams = {}) {
  const response = await apiClient.get<RecommendationFeedback[] | PaginatedResponse<RecommendationFeedback>>("/feedback/", { params });
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results;
}

export async function fetchPaginatedFeedback(params: FeedbackListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<RecommendationFeedback>>("/feedback/", { params });
  return response.data;
}
