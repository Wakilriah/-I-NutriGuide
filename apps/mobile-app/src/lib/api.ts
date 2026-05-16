import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { useAuthStore } from "../stores/auth-store";

function getExpoHost() {
  const configHost = (Constants.expoConfig as { hostUri?: string } | null)?.hostUri;
  const legacyConstants = Constants as unknown as {
    manifest?: { debuggerHost?: string };
    manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
  };
  const hostUri = configHost ?? legacyConstants.manifest2?.extra?.expoClient?.hostUri ?? legacyConstants.manifest?.debuggerHost;
  return hostUri?.split(":")[0];
}

function getDefaultApiBaseUrl() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `http://${window.location.hostname}:8000/api/v1`;
  }

  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  const expoHost = getExpoHost();
  if (expoHost) {
    return `http://${expoHost}:8000/api/v1`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000/api/v1";
  }

  return "http://127.0.0.1:8000/api/v1";
}

export const API_BASE_URL = getDefaultApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

type TokenRefreshResponse = {
  access: string;
};

const AUTH_FREE_PATHS = ["/auth/login/", "/auth/register/", "/auth/refresh/"];
let refreshPromise: Promise<string | null> | null = null;

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const atobDecoder = (globalThis as unknown as { atob?: (value: string) => string }).atob;
    const bufferDecoder = (globalThis as unknown as { Buffer?: { from: (value: string, encoding: string) => { toString: (encoding: string) => string } } }).Buffer;
    const json = atobDecoder ? atobDecoder(padded) : bufferDecoder?.from(padded, "base64").toString("utf8");
    return json ? (JSON.parse(json) as { exp?: number }) : null;
  } catch {
    return null;
  }
}

export function isAccessTokenAlive(token: string, skewSeconds = 30) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return false;
  }
  return payload.exp > Math.floor(Date.now() / 1000) + skewSeconds;
}

function isAuthFreeRequest(url?: string) {
  return AUTH_FREE_PATHS.some((path) => url?.endsWith(path) || url?.includes(path));
}

async function refreshAccessToken() {
  const { refreshToken, clearSession, updateAccessToken } = useAuthStore.getState();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post<TokenRefreshResponse>(`${API_BASE_URL}/auth/refresh/`, { refresh: refreshToken });
    await updateAccessToken(response.data.access);
    return response.data.access;
  } catch {
    await clearSession();
    return null;
  }
}

async function getValidAccessToken() {
  const token = useAuthStore.getState().accessToken;
  if (!token) {
    return null;
  }
  if (isAccessTokenAlive(token)) {
    return token;
  }

  refreshPromise = refreshPromise ?? refreshAccessToken().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

apiClient.interceptors.request.use(async (config) => {
  if (isAuthFreeRequest(config.url)) {
    return config;
  }

  const token = await getValidAccessToken();
  if (token) {
    config.headers = { ...config.headers, Authorization: `Bearer ${token}` } as typeof config.headers;
  }
  return config;
});
