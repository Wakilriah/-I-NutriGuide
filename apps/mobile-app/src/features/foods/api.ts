import { apiClient } from "../../lib/api";

export type FoodNutrient = {
  name: string;
  slug: string;
  amount: string;
  unit: string;
};

export type FoodSearchItem = {
  id: number;
  name: string;
  slug: string;
  category?: string;
  serving_size_g: string;
  nutrients: FoodNutrient[];
};

type FoodSearchResponse = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: FoodSearchItem[];
};

export async function searchFoods(search: string) {
  const page = await searchFoodsPage({ search, page: 1 });
  return page.results;
}

export async function searchFoodsPage({ page = 1, search = "" }: { page?: number; search?: string }) {
  const response = await apiClient.get<FoodSearchResponse | FoodSearchItem[]>("/foods/", {
    params: {
      page_size: 20,
      page,
      search,
    },
  });

  if (Array.isArray(response.data)) {
    return { count: response.data.length, next: null, previous: null, results: response.data };
  }

  return {
    count: response.data.count ?? response.data.results?.length ?? 0,
    next: response.data.next ?? null,
    previous: response.data.previous ?? null,
    results: response.data.results ?? [],
  };
}
