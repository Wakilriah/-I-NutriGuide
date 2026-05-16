import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type StoredSession = {
  access: string;
  refresh: string;
};

const SESSION_KEY = "inutriguide-mobile-session";

function getWebStorage() {
  return (globalThis as unknown as { localStorage?: Storage }).localStorage;
}

export async function saveSession(session: StoredSession) {
  const value = JSON.stringify(session);
  if (Platform.OS === "web") {
    getWebStorage()?.setItem(SESSION_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, value);
}

export async function loadSession() {
  if (Platform.OS === "web") {
    const raw = getWebStorage()?.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  }
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  return raw ? (JSON.parse(raw) as StoredSession) : null;
}

export async function deleteSession() {
  if (Platform.OS === "web") {
    getWebStorage()?.removeItem(SESSION_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
