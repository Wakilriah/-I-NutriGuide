import { apiClient } from "./client";

export type DashboardMetrics = {
  total_users: number;
  total_foods: number;
  total_supplements: number;
  total_recommendations: number;
  average_feedback_rating: number;
  total_saved_foods: number;
  total_association_rules: number;
  active_association_rules: number;
  recommendation_items_with_rules: number;
  average_rule_score: number;
  most_used_supplements: Array<{ supplement__name: string; supplement__slug: string; count: number }>;
  most_recommended_foods: Array<{ food__name: string; food__slug: string; count: number }>;
  most_saved_foods: Array<{ recommendation_item__food__name: string; recommendation_item__food__slug: string; count: number }>;
  food_category_counts: Array<{ category__name: string; category__slug: string; count: number }>;
  food_source_counts: Array<{ source: string; count: number }>;
  rule_usage: Array<{ rule_id: number | null; label: string; count: number }>;
};

export async function fetchDashboardMetrics() {
  const response = await apiClient.get<DashboardMetrics>("/admin/dashboard/");
  return response.data;
}
