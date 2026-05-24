import { apiClient } from "../../lib/api";

export type Supplement = {
  id: number;
  name: string;
  slug: string;
  description: string;
  common_dose: string;
  is_active: boolean;
};

export type UserSupplement = {
  id: number;
  supplement: Supplement;
  dose: string;
  frequency: string;
  time_of_day: string;
  active: boolean;
};

export type UserSupplementPayload = {
  supplement_id?: number;
  dose: string;
  frequency: string;
  time_of_day: string;
  active?: boolean;
};

type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export async function listSupplements(search = "") {
  const response = await apiClient.get<Supplement[] | PaginatedResponse<Supplement>>("/supplements/", {
    params: search.trim() ? { search: search.trim(), page_size: 20 } : { page_size: 20 },
  });
  return Array.isArray(response.data) ? response.data : response.data.results;
}

export async function listUserSupplements() {
  const response = await apiClient.get<UserSupplement[]>("/user-supplements/");
  return response.data;
}

export async function createUserSupplement(payload: Required<Pick<UserSupplementPayload, "supplement_id">> & UserSupplementPayload) {
  const response = await apiClient.post<UserSupplement>("/user-supplements/", payload);
  return response.data;
}

export async function updateUserSupplement(id: number, payload: UserSupplementPayload) {
  const response = await apiClient.patch<UserSupplement>(`/user-supplements/${id}/`, payload);
  return response.data;
}

export async function deleteUserSupplement(id: number) {
  await apiClient.delete(`/user-supplements/${id}/`);
}
