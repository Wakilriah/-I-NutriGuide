import type { RecommendationRun } from "../recommendations/api";
import { apiClient } from "../../lib/api";

export type ChatCitedItem = {
  id: number;
  rank: number;
  food: { id: number; name: string; slug: string; category: string };
  score: number;
  matched_nutrients: string[];
  matched_rules: Array<Record<string, unknown>>;
  warnings: string[];
  explanation: string;
};

export type ChatMessage = {
  id: number | string;
  role: "assistant" | "user";
  content: string;
  metadata: {
    intent?: string;
    cited_items?: ChatCitedItem[];
  };
  recommendation_run_id: string | null;
  groq_model: string;
  token_usage: Record<string, unknown>;
  error_code: string;
  created_at: string;
};

export type ChatSession = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
};

export type SendChatMessagePayload = {
  session_id?: string;
  message: string;
};

export type SendChatMessageResponse = {
  session_id: string;
  user_message: ChatMessage;
  assistant_message: ChatMessage;
  recommendation_run: RecommendationRun | null;
  cited_items: ChatCitedItem[];
};

export async function listChatSessions() {
  const response = await apiClient.get<ChatSession[]>("/chat/sessions/");
  return response.data;
}

export async function sendChatMessage(payload: SendChatMessagePayload) {
  const response = await apiClient.post<SendChatMessageResponse>("/chat/messages/", payload);
  return response.data;
}

