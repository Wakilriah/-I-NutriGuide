import { apiClient } from "./client";
import type { PaginatedResponse } from "./types";

export type NotificationAudience = "enabled_users" | "specific_users";

export type NotificationCampaignPayload = {
  audience: NotificationAudience;
  recipient_ids: number[];
  title: string;
  body: string;
  destination_url?: string;
};

export type NotificationCampaign = NotificationCampaignPayload & {
  id: number;
  status: "queued" | "sending" | "completed" | "failed";
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  error_message: string;
  created_by_email: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

export async function fetchNotificationCampaigns() {
  const response = await apiClient.get<NotificationCampaign[] | PaginatedResponse<NotificationCampaign>>("/admin/notification-campaigns/");
  return Array.isArray(response.data) ? response.data : response.data.results;
}

export async function fetchNotificationAudienceCount(payload: NotificationCampaignPayload) {
  const response = await apiClient.post<{ count: number }>("/admin/notification-campaigns/audience-count/", payload);
  return response.data.count;
}

export async function createNotificationCampaign(payload: NotificationCampaignPayload) {
  const response = await apiClient.post<NotificationCampaign>("/admin/notification-campaigns/", payload);
  return response.data;
}
