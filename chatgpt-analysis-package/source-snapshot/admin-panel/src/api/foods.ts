import { apiClient } from "./client";

export type FoodNutrient = {
  name: string;
  slug: string;
  amount: string;
  unit: string;
  per_quantity: string;
  per_unit: string;
};

export type Food = {
  id: number;
  name: string;
  slug: string;
  category: string;
  description: string;
  scientific_name: string;
  ciqual_code: string | null;
  source: string;
  serving_size_g: string;
  image_url: string;
  is_active: boolean;
  nutrients: FoodNutrient[];
  created_at: string;
  updated_at: string;
};

export type FoodCategory = {
  id: number;
  name: string;
  slug: string;
  ciqual_group_code: string;
  ciqual_subgroup_code: string;
  ciqual_subsubgroup_code: string;
  source: string;
};

export type FoodListParams = {
  search?: string;
  category?: string;
  source?: string;
  is_active?: "true" | "false";
  page?: number;
  page_size?: number;
};

export type PaginatedFoodResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Food[];
};

export type FoodPayload = {
  name: string;
  category_slug: string;
  description: string;
  scientific_name?: string;
  source?: string;
  serving_size_g?: string;
  image_url: string;
  is_active: boolean;
  nutrient_items: Array<{
    nutrient_slug: string;
    amount: string;
    unit?: string;
    per_quantity?: string;
    per_unit?: string;
  }>;
};

export async function fetchFoods(params: FoodListParams = {}) {
  const response = await apiClient.get<PaginatedFoodResponse>("/foods/", { params });
  return response.data;
}

export async function fetchFood(slug: string) {
  const response = await apiClient.get<Food>(`/foods/${slug}/`);
  return response.data;
}

export async function fetchFoodCategories() {
  const response = await apiClient.get<FoodCategory[]>("/food-categories/");
  return response.data;
}

export async function createFood(payload: FoodPayload) {
  const response = await apiClient.post<Food>("/foods/", payload);
  return response.data;
}

export async function updateFood(slug: string, payload: FoodPayload) {
  const response = await apiClient.patch<Food>(`/foods/${slug}/`, payload);
  return response.data;
}

export async function deleteFood(slug: string) {
  await apiClient.delete(`/foods/${slug}/`);
}
