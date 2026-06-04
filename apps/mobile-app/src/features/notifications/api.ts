import { apiClient } from "../../lib/api";

export type NotificationPreferences = {
  notifications_enabled: boolean;
  timezone: string;
  supplement_reminders_enabled: boolean;
  supplement_reminder_time: string;
  water_reminders_enabled: boolean;
  water_morning_time: string;
  water_afternoon_time: string;
  water_evening_time: string;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at: string;
  updated_at: string;
};

export type NotificationPreferencesPayload = Partial<
  Pick<
    NotificationPreferences,
    | "notifications_enabled"
    | "timezone"
    | "supplement_reminders_enabled"
    | "supplement_reminder_time"
    | "water_reminders_enabled"
    | "water_morning_time"
    | "water_afternoon_time"
    | "water_evening_time"
    | "quiet_hours_start"
    | "quiet_hours_end"
  >
>;

export async function getNotificationPreferences() {
  const response = await apiClient.get<NotificationPreferences>("/notifications/preferences/");
  return response.data;
}

export async function updateNotificationPreferences(payload: NotificationPreferencesPayload) {
  const response = await apiClient.patch<NotificationPreferences>("/notifications/preferences/", payload);
  return response.data;
}

export async function registerPushToken(payload: { token: string; platform: "ios" | "android" | "web"; device_id?: string }) {
  const response = await apiClient.post("/notifications/register-token/", payload);
  return response.data;
}
