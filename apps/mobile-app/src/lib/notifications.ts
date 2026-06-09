import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { registerPushToken, updateNotificationPreferences } from "../features/notifications/api";

let registrationPromise: Promise<void> | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function registerForPushNotificationsOnce() {
  registrationPromise = registrationPromise ?? registerForPushNotifications().finally(() => {
    registrationPromise = null;
  });
  return registrationPromise;
}

async function registerForPushNotifications() {
  if (Platform.OS === "web" || !Device.isDevice) {
    return;
  }

  if (Platform.OS === "android") {
    await Promise.all([
      Notifications.setNotificationChannelAsync("daily-reminders", {
        name: "Daily reminders",
        importance: Notifications.AndroidImportance.HIGH,
      }),
      Notifications.setNotificationChannelAsync("supplements", {
        name: "Supplement reminders",
        importance: Notifications.AndroidImportance.HIGH,
      }),
      Notifications.setNotificationChannelAsync("recommendations", {
        name: "Recommendation updates",
        importance: Notifications.AndroidImportance.HIGH,
      }),
    ]);
  }

  const existing = await Notifications.getPermissionsAsync();
  const finalStatus = existing.status === "granted" ? existing.status : (await Notifications.requestPermissionsAsync()).status;
  if (finalStatus !== "granted") {
    return;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    return;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await registerPushToken({ token, platform: Platform.OS === "ios" ? "ios" : "android" });
  await updateNotificationPreferences({ notifications_enabled: true, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" });
}
