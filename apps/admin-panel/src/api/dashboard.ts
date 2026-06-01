import { apiClient } from "./client";

export type DashboardMetrics = {
  total_users: number;
  active_users: number;
  admin_users: number;
  survey_users: number;
  total_foods: number;
  active_foods: number;
  ciqual_foods: number;
  total_nutrients: number;
  total_supplements: number;
  active_supplements: number;
  user_supplement_entries: number;
  total_recommendations: number;
  total_recommendation_items: number;
  average_recommendation_score: number;
  average_feedback_rating: number;
  total_feedback: number;
  helpful_feedback: number;
  total_saved_foods: number;
  total_association_rules: number;
  active_association_rules: number;
  total_supplement_categories: number;
  active_supplement_categories: number;
  total_supplement_normalizations: number;
  active_supplement_normalizations: number;
  total_synergy_seed_rules: number;
  active_synergy_seed_rules: number;
  total_safety_constraints: number;
  active_safety_constraints: number;
  total_mined_association_rules: number;
  active_mined_association_rules: number;
  total_association_transactions: number;
  total_association_transaction_items: number;
  total_nutrient_interactions: number;
  active_nutrient_interactions: number;
  average_mined_confidence: number;
  average_mined_lift: number;
  recommendation_items_with_rules: number;
  average_rule_score: number;
  most_used_supplements: Array<{ supplement__name: string; supplement__slug: string; count: number }>;
  most_recommended_foods: Array<{ food__name: string; food__slug: string; count: number }>;
  most_saved_foods: Array<{ recommendation_item__food__name: string; recommendation_item__food__slug: string; count: number }>;
  food_category_counts: Array<{ category__name: string; category__slug: string; count: number }>;
  food_source_counts: Array<{ source: string; count: number }>;
  rule_usage: Array<{ rule_id: number | null; label: string; count: number }>;
  synergy_rule_category_counts: Array<{ supplement_category_name: string; count: number }>;
  mined_rule_source_counts: Array<{ source: string; count: number }>;
  safety_constraint_type_counts: Array<{ constraint_type: string; count: number }>;
};

export async function fetchDashboardMetrics() {
  const response = await apiClient.get<DashboardMetrics>("/admin/dashboard/");
  return response.data;
}
