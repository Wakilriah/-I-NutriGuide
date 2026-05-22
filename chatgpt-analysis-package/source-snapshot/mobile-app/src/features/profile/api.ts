import { apiClient } from "../../lib/api";

export type UserProfile = {
  age: number | null;
  gender: string;
  height_cm: string | null;
  weight_kg: string | null;
  goal: string;
  activity_level: string;
  diet_type: string;
  allergies: string[];
  dietary_restrictions: string[];
  disliked_foods: string[];
};

export type ProfileUpdatePayload = Partial<{
  age: number | null;
  gender: string;
  height_cm: number | null;
  weight_kg: number | null;
  goal: string;
  activity_level: string;
  diet_type: string;
  allergies: string[];
  dietary_restrictions: string[];
  disliked_foods: string[];
}>;

export function isProfileComplete(profile: UserProfile) {
  return Boolean(profile.age && profile.gender && profile.height_cm && profile.weight_kg && profile.goal && profile.activity_level);
}

export async function getProfile() {
  const response = await apiClient.get<UserProfile>("/profile/");
  return response.data;
}

export async function updateProfile(payload: ProfileUpdatePayload) {
  const response = await apiClient.patch<UserProfile>("/profile/", payload);
  return response.data;
}

export function parseCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
