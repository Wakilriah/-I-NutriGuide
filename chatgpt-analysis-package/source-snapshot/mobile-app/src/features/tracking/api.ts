import { apiClient } from "../../lib/api";

export type DailyTracking = {
  date: string;
  weight_kg: string | null;
  water_ml: number;
  calories: number;
  protein_g: string;
  fiber_g: string;
  steps: number;
  supplements_taken: string[];
  goals_completed: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type DailyTrackingPayload = Partial<{
  weight_kg: number | null;
  water_ml: number;
  calories: number;
  protein_g: number;
  fiber_g: number;
  steps: number;
  supplements_taken: string[];
  goals_completed: boolean;
  notes: string;
}>;

export async function getTodayTracking() {
  const response = await apiClient.get<DailyTracking>("/tracking/today/");
  return response.data;
}

export async function updateTodayTracking(payload: DailyTrackingPayload) {
  const response = await apiClient.patch<DailyTracking>("/tracking/today/", payload);
  return response.data;
}

export async function listTrackingHistory() {
  const response = await apiClient.get<DailyTracking[]>("/tracking/history/");
  return response.data;
}
