import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getWebPushConfig, registerPushToken, updateNotificationPreferences } from "../features/notifications/api";

let registrationPromise: Promise<boolean> | null = null;

export class PushRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PushRegistrationError";
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function registerForPushNotificationsOnce(options: { requestWebPermission?: boolean } = {}) {
  if (options.requestWebPermission) {
    return registerForPushNotifications(options).catch(normalizeRegistrationError);
  }
  registrationPromise = registrationPromise ?? registerForPushNotifications(options).catch(normalizeRegistrationError).finally(() => {
    registrationPromise = null;
  });
  return registrationPromise;
}

async function registerForPushNotifications({ requestWebPermission = false }: { requestWebPermission?: boolean }) {
  if (Platform.OS === "web") {
    return registerForWebPushNotifications(requestWebPermission);
  }
  if (!Device.isDevice) {
    throw new PushRegistrationError("Push notifications require a physical device.");
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
    throw new PushRegistrationError("Notification permission is disabled. Enable it in your device settings.");
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    throw new PushRegistrationError("Push notification configuration is unavailable.");
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await registerPushToken({ token, platform: Platform.OS === "ios" ? "ios" : "android" });
  await updateNotificationPreferences({ notifications_enabled: true, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" });
  return true;
}

async function registerForWebPushNotifications(requestPermission: boolean) {
  if (
    typeof window === "undefined"
    || !("Notification" in window)
    || !("serviceWorker" in navigator)
    || !("PushManager" in window)
  ) {
    throw new PushRegistrationError("This browser does not support web push notifications. On iPhone, install the app to your Home Screen first.");
  }

  const currentPermission = window.Notification.permission;
  if (currentPermission !== "granted" && !requestPermission) {
    return false;
  }
  const permission = currentPermission === "default"
    ? await window.Notification.requestPermission()
    : currentPermission;
  if (permission !== "granted") {
    throw new PushRegistrationError("Notifications are blocked for app.matchcesoir.pro. Allow them in your browser site settings, then try again.");
  }

  const { public_key: publicKey } = await getWebPushConfig();
  if (!publicKey) {
    throw new PushRegistrationError("Web push notification configuration is unavailable.");
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

function normalizeRegistrationError(error: unknown): never {
  if (error instanceof PushRegistrationError) {
    throw error;
  }
  const message = error instanceof Error ? error.message : "Unknown registration error";
  throw new PushRegistrationError(`Push registration failed: ${message}`);
}
