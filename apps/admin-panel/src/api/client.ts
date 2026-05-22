import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/auth-store";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://api.matchcesoir.pro/api/v1";
const AUTH_STORAGE_KEY = "inutriguide-admin-auth";
const DEBUG_AUTH_REFRESH = import.meta.env.VITE_DEBUG_AUTH_REFRESH === "true";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<string | null> | null = null;

function logAuthStep(message: string, details?: Record<string, unknown>) {
  if (!DEBUG_AUTH_REFRESH) {
    return;
  }
  console.log(`[admin-api auth] ${message}`, details ?? "");
}

function getPersistedAuthDebugSnapshot() {
  try {
    const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!rawValue) {
      return { storageKey: AUTH_STORAGE_KEY, hasStorageValue: false };
    }
    const parsed = JSON.parse(rawValue) as {
      state?: {
        accessToken?: string | null;
        refreshToken?: string | null;
      };
    };
    return {
      storageKey: AUTH_STORAGE_KEY,
      hasStorageValue: true,
      hasPersistedAccessToken: Boolean(parsed.state?.accessToken),
      hasPersistedRefreshToken: Boolean(parsed.state?.refreshToken),
      persistedAccessTokenLength: parsed.state?.accessToken?.length ?? 0,
      persistedRefreshTokenLength: parsed.state?.refreshToken?.length ?? 0,
    };
  } catch (error) {
    return { storageKey: AUTH_STORAGE_KEY, hasStorageValue: true, parseError: String(error) };
  }
}

function getJwtExpiryMs(token: string) {
  const [, payload] = token.split(".");
  if (!payload) {
    return null;
  }

  try {
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4), "=");
    const decodedPayload = JSON.parse(window.atob(paddedPayload)) as { exp?: number };
    return decodedPayload.exp ? decodedPayload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isAccessTokenAlive(token: string) {
  const expiryMs = getJwtExpiryMs(token);
  if (!expiryMs) {
    logAuthStep("access token is missing/unreadable exp claim, treating as invalid", {
      tokenLength: token.length,
    });
    return false;
  }
  const alive = expiryMs > Date.now() + 30_000;
  logAuthStep("checked access token expiry", {
    alive,
    expiresAt: new Date(expiryMs).toISOString(),
    secondsUntilExpiry: Math.round((expiryMs - Date.now()) / 1000),
  });
  return alive;
}

async function refreshAccessToken() {
  const { logout, refreshToken, setAccessToken } = useAuthStore.getState();
  logAuthStep("refresh requested", {
    hasRefreshToken: Boolean(refreshToken),
    refreshTokenLength: refreshToken?.length ?? 0,
    persistedStorage: getPersistedAuthDebugSnapshot(),
  });
  if (!refreshToken) {
    logAuthStep("refresh skipped because no refresh token exists");
    return null;
  }

  try {
    const response = await refreshClient.post<{ access: string }>("/auth/refresh/", { refresh: refreshToken });
    logAuthStep("refresh succeeded", {
      hasAccess: Boolean(response.data.access),
      accessTokenLength: response.data.access.length,
    });
    setAccessToken(response.data.access);
    return response.data.access;
  } catch (error) {
    logAuthStep("refresh failed, logging out", {
      status: axios.isAxiosError(error) ? error.response?.status : undefined,
      data: axios.isAxiosError(error) ? error.response?.data : undefined,
    });
    logout();
    return null;
  }
}

async function getLiveAccessToken() {
  const { accessToken: token, refreshToken } = useAuthStore.getState();
  logAuthStep("pre-request token check", {
    hasAccessToken: Boolean(token),
    accessTokenLength: token?.length ?? 0,
    hasRefreshToken: Boolean(refreshToken),
    refreshTokenLength: refreshToken?.length ?? 0,
    persistedStorage: getPersistedAuthDebugSnapshot(),
  });

  if (token && isAccessTokenAlive(token)) {
    logAuthStep("using existing access token");
    return token;
  }

  if (!refreshToken) {
    logAuthStep("no usable access token and no refresh token available");
    return null;
  }

  logAuthStep(token ? "access token invalid/expired, refreshing before request" : "access token missing, refreshing before request");
  refreshPromise ??= refreshAccessToken().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

function setAuthorizationHeader(config: InternalAxiosRequestConfig, token: string) {
  const headers = AxiosHeaders.from(config.headers);
  headers.set("Authorization", `Bearer ${token}`);
  config.headers = headers;
}

function hasAuthorizationHeader(config: InternalAxiosRequestConfig) {
  return AxiosHeaders.from(config.headers).has("Authorization");
}

function isAuthEndpoint(url?: string) {
  return Boolean(url?.includes("/auth/login/") || url?.includes("/auth/register/") || url?.includes("/auth/refresh/"));
}

function isTokenNotValidError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.data && typeof error.response.data === "object" && "code" in error.response.data && error.response.data.code === "token_not_valid";
}

apiClient.interceptors.request.use(async (config) => {
  if (isAuthEndpoint(config.url) || hasAuthorizationHeader(config)) {
    logAuthStep("request skipped auth refresh", {
      url: config.url,
      isAuthEndpoint: isAuthEndpoint(config.url),
      hasExplicitAuthorizationHeader: hasAuthorizationHeader(config),
    });
    return config;
  }

  const token = await getLiveAccessToken();
  if (token) {
    logAuthStep("attaching bearer token to request", { url: config.url });
    setAuthorizationHeader(config, token);
  } else {
    logAuthStep("sending request without bearer token", { url: config.url });
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const shouldRefresh = error.response?.status === 401 || isTokenNotValidError(error);
    logAuthStep("response error received", {
      url: originalRequest?.url,
      status: error.response?.status,
      code: error.response?.data?.code,
      shouldRefresh,
      alreadyRetried: originalRequest?._retry,
    });
    if (!shouldRefresh || !originalRequest || originalRequest._retry || isAuthEndpoint(originalRequest.url)) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });

    const token = await refreshPromise;
    if (!token) {
      logAuthStep("retry aborted because refresh returned no access token");
      return Promise.reject(error);
    }

    logAuthStep("retrying original request with refreshed access token", { url: originalRequest.url });
    setAuthorizationHeader(originalRequest, token);
    return apiClient(originalRequest);
  },
);
