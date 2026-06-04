import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { router } from "expo-router";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  } as any),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === "string") {
        const path = url.replace("inutriguide://", "/");
        router.push(path as never);
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return { expoPushToken, notification };
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
    Notifications.setNotificationChannelAsync('supplements', {
      name: 'Supplement reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250],
      lightColor: '#1F6F43',
    });
    Notifications.setNotificationChannelAsync('recommendations', {
      name: 'Recommendation updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250],
      lightColor: '#935A12',
    });
  }

  if (Device.isDevice) {
    const existingStatus = await Notifications.getPermissionsAsync() as any;
    let finalStatus = existingStatus.status;
    if (existingStatus.status !== 'granted') {
      const status = await Notifications.requestPermissionsAsync() as any;
      finalStatus = status.status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      if (!projectId) {
        throw new Error('Project ID not found');
      }
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log(token);
    } catch (e) {
      console.log(e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
