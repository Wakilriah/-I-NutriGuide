import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getWebPushConfig, registerPushToken, updateNotificationPreferences } from "../features/notifications/api";

let registrationPromise: Promise<boolean> | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
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
  if (Platform.OS === "web") {
    return registerForWebPushNotifications();
  }
  if (!Device.isDevice) {
    return false;
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
    return false;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    return false;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await registerPushToken({ token, platform: Platform.OS === "ios" ? "ios" : "android" });
  await updateNotificationPreferences({ notifications_enabled: true, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" });
  return true;
}

async function registerForWebPushNotifications() {
  if (
    typeof window === "undefined"
    || !("Notification" in window)
    || !("serviceWorker" in navigator)
    || !("PushManager" in window)
  ) {
    return false;
  }

  const permission = window.Notification.permission === "granted"
    ? "granted"
    : await window.Notification.requestPermission();
  if (permission !== "granted") {
    return false;
  }

  const { public_key: publicKey } = await getWebPushConfig();
  if (!publicKey) {
    return false;
  }
  const registration = await navigator.serviceWorker.register("/notifications-sw.js");
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  await registerPushToken({
    token: JSON.stringify(subscription.toJSON()),
    platform: "web",
    device_id: subscription.endpoint,
  });
  await updateNotificationPreferences({ notifications_enabled: true, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" });
  return true;
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}
