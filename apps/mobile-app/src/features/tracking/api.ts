import { apiClient } from "../../lib/api";

export type FoodEntry = {
  food_id: number;
  food_name: string;
  serving_g: number;
  calories: number;
  protein_g: number;
  timestamp: string;
};

export type DailyTracking = {
  id: number;
  date: string;
  weight_kg: string | null;
  water_ml: number;
  calories: number;
  protein_g: string;
  fiber_g: string;
  steps: number;
  notes: string;
  supplements_taken: string[];
  food_entries: FoodEntry[];
  goals_completed: boolean;
};

export type DailyTrackingUpdatePayload = Partial<{
  weight_kg: number | string | null;
  water_ml: number;
  calories: number;
  protein_g: number | string;
  fiber_g: number | string;
  steps: number;
  notes: string;
  supplements_taken: string[];
  food_entries: FoodEntry[];
  goals_completed: boolean;
}>;

export async function getTodayTracking() {
  const response = await apiClient.get<DailyTracking>("/tracking/today/");
  return response.data;
}

export async function updateTodayTracking(payload: DailyTrackingUpdatePayload) {
  const response = await apiClient.patch<DailyTracking>("/tracking/today/", payload);
  return response.data;
}

export async function getTrackingHistory() {
  const response = await apiClient.get<DailyTracking[]>("/tracking/history/");
  return response.data;
}
