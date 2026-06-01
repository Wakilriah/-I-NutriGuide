import { apiClient } from "../../lib/api";

export type NotificationLog = {
  id: number;
  notification_type: "food_reminder" | "supplement_reminder" | "recommendation_ready" | "general";
  title: string;
  body: string;
  data: Record<string, unknown>;
  sent_at: string;
  read_at: string | null;
};

export async function listNotifications() {
  const response = await apiClient.get<NotificationLog[]>("/notifications/");
  return response.data;
}
