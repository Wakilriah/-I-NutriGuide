import { apiClient, getBackendMediaUrl } from "../../lib/api";

export function resolveFoodImageUri(imagePath?: string | null) {
  return getBackendMediaUrl(imagePath);
}

export type RecommendationItem = {
  id: number;
  recommendation_id?: number;
  run_id: string;
  rank: number;
  food: {
    id: number;
    name: string;
    food_name?: string;
    slug: string;
    category: string;
    image_path?: string;
    image_alt?: string;
    nutrient_tags?: string[];
    synergy_reason?: string;
    avoid_or_caution?: string;
    nutrients?: string[];
  };
  matched_supplement: { id: number; name: string; slug: string } | null;
  score: string | number;
  confidence_score?: number;
  confidence_label?: string;
  score_breakdown?: Record<string, number>;
  nutrient_score: string | number;
  rule_score: string | number;
  preference_score: string | number;
  matched_nutrients: string[];
  matched_rules: RecommendationRuleMatch[];
  tags: string[];
  warnings: RecommendationWarning[];
  safety_status?: "SAFE" | "WARNING" | "BLOCKED";
  safety_level?: "LOW" | "MEDIUM" | "HIGH";
  safety_message?: string;
  blocked_reason?: string;
  alternatives?: Array<RecommendationItem["food"] & { match_score?: number; reason?: string }>;
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

export type RecommendationRuleMatch = {
  antecedent?: string;
  consequent?: string;
  antecedent_items?: string[];
  consequent_items?: string[];
  support?: number;
  confidence?: number;
  lift?: number;
  explanation?: string;
  score?: number;
  source?: string;
  rule_type?: string;
  food_slug?: string;
  image_path?: string;
  image_alt?: string;
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
  alternatives?: Array<RecommendationItem["food"] & { match_score?: number; reason?: string }>;
  score_details?: Record<string, unknown>;
};

export type RecommendationWarning = string | {
  level: "info" | "caution" | "warning" | "LOW" | "MEDIUM" | "HIGH";
  safety_level?: "LOW" | "MEDIUM" | "HIGH";
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

export type RecommendationGenerationJob = {
  status: "queued";
  task_id: string;
};

export function resolveRecommendationConfidence(item: Pick<RecommendationItem, "confidence_score" | "score" | "score_breakdown">) {
  const confidence = Number(item.confidence_score);
  const hasCalculatedConfidence = Boolean(item.score_breakdown && Object.keys(item.score_breakdown).length);
  const value = Number.isFinite(confidence) && (confidence !== 0 || hasCalculatedConfidence)
    ? confidence
    : Number(item.score);
  return Math.max(0, Math.min(Number.isFinite(value) ? value : 0, 1));
}

export function resolveRecommendationSynergy(item: Pick<RecommendationItem, "score_breakdown" | "nutrient_score">) {
  const breakdown = item.score_breakdown;
  const value = breakdown && "supplement_score" in breakdown
    ? Number(breakdown.supplement_score)
    : Number(breakdown?.nutrient_synergy_score ?? item.nutrient_score);
  return Math.max(0, Math.min(Number.isFinite(value) ? value : 0, 1));
}

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
  | "not_available"
  | "bad_taste"
  | "allergy_issue"
  | "do_not_eat"
  | "already_tried"
  | "good_recommendation"
  | "helpful"
  | "not_helpful";

export type FeedbackPayload = {
  recommendation_item_id: number;
  food_id?: number;
  feedback_type: FeedbackType;
  rating?: number;
  is_helpful?: boolean;
  comment?: string;
  reason?: string;
  supplement_context?: unknown[];
  context?: Record<string, unknown>;
};

export type TimingPlanItem = {
  supplement: { id: number; name: string; slug: string };
  best_time: string;
  recommended_foods: RecommendationItem[];
  avoid_near_intake: string[];
  explanation: string;
  warnings: Array<{ level: string; message: string }>;
};

export type MealPlan = {
  meals: Record<string, {
    slot: string;
    foods: Array<Partial<RecommendationItem> & { food_name?: string; name?: string }>;
    supplement_connection: string;
    explanation: string;
    warnings: RecommendationWarning[];
  }>;
  warnings: RecommendationWarning[];
};

export async function generateRecommendations(limit = 10) {
  const response = await apiClient.post<RecommendationRun>("/recommendations/generate/", { limit });
  return response.data;
}

export async function queueRecommendationGeneration(limit = 10) {
  const response = await apiClient.post<RecommendationGenerationJob>("/recommendations/generate/", { limit, async_generate: true });
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

export async function getTimingPlan() {
  const response = await apiClient.get<{ items: TimingPlanItem[] }>("/recommendations/timing-plan/");
  return response.data;
}

export async function getMealPlan() {
  const response = await apiClient.get<MealPlan>("/recommendations/meal-plan/");
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
