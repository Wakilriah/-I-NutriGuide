import { apiClient } from "./client";
import type { ListParams, PaginatedResponse } from "./types";

export type AdminChatCitedItem = {
  id: number;
  rank?: number;
  food: {
    id: number;
    name: string;
    slug: string;
    category: string;
  };
  score: number;
  matched_nutrients?: string[];
  matched_rules?: Array<Record<string, unknown>>;
  warnings?: string[];
  explanation: string;
};

export type AdminChatMessage = {
  id: number;
  role: "assistant" | "user";
  content: string;
  metadata: {
    intent?: string;
    cited_items?: AdminChatCitedItem[];
    provider_error?: string;
  };
  recommendation_run_id: string | null;
  groq_model: string;
  token_usage: Record<string, unknown>;
  error_code: string;
  created_at: string;
};

export type AdminChatSession = {
  id: string;
  user: {
    id: number;
    email: string;
    name: string;
  };
  title: string;
  created_at: string;
  updated_at: string;
  messages: AdminChatMessage[];
};

export type AdminChatUser = {
  id: number;
  email: string;
  name: string;
  chat_session_count: number;
  chat_message_count: number;
  latest_chat_at: string | null;
};

export type AdminChatListParams = ListParams & {
  user_id?: number;
};

export async function fetchPaginatedAdminChatUsers(params: ListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<AdminChatUser>>("/admin/chats/users/", { params });
  return response.data;
}

export async function fetchPaginatedAdminChatSessions(params: AdminChatListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<AdminChatSession>>("/admin/chats/", { params });
  return response.data;
}

export async function clearAdminUserChatSessions(userId: number) {
  await apiClient.delete(`/admin/chats/users/${userId}/clear/`);
}
