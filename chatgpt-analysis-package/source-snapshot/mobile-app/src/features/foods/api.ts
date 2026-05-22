import { apiClient } from "../../lib/api";

export type FoodSearchItem = {
  id: number;
  name: string;
  slug: string;
  category?: string;
};

type FoodSearchResponse = {
  results?: FoodSearchItem[];
};

export async function searchFoods(search: string) {
  const response = await apiClient.get<FoodSearchResponse | FoodSearchItem[]>("/foods/", {
    params: {
      page_size: 20,
      search,
    },
  });

  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}
