import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { apiClient, isAccessTokenAlive } from "./api";
import { useAuthStore } from "../stores/auth-store";

function makeToken(exp: number) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ exp })}.signature`;
}

describe("api client auth", () => {
  afterEach(async () => {
    jest.restoreAllMocks();
    await useAuthStore.getState().clearSession();
  });

  it("detects whether a JWT access token is still alive", () => {
    const now = Math.floor(Date.now() / 1000);

    expect(isAccessTokenAlive(makeToken(now + 300))).toBe(true);
    expect(isAccessTokenAlive(makeToken(now - 30))).toBe(false);
  });

  it("refreshes an expired access token before a protected request", async () => {
    const now = Math.floor(Date.now() / 1000);
    const expiredToken = makeToken(now - 60);
    const freshToken = makeToken(now + 300);
    const postSpy = jest.spyOn(axios, "post").mockResolvedValue({ data: { access: freshToken } });

    useAuthStore.setState({
      accessToken: expiredToken,
      refreshToken: "refresh-token",
      user: { id: 1, email: "user@example.com", name: "Demo User", is_staff: false },
    });

    const response = await apiClient.get("/profile/", {
      adapter: async (config) => ({
        config,
        data: {},
        headers: {},
        status: 200,
        statusText: "OK",
      }),
    });

    expect(postSpy).toHaveBeenCalledWith(expect.stringContaining("/auth/refresh/"), { refresh: "refresh-token" });
    expect(response.config.headers.Authorization).toBe(`Bearer ${freshToken}`);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "inutriguide-mobile-session",
      JSON.stringify({ access: freshToken, refresh: "refresh-token" }),
    );
  });

  it("does not refresh for login, register, or refresh calls", async () => {
    const now = Math.floor(Date.now() / 1000);
    const postSpy = jest.spyOn(axios, "post");
    useAuthStore.setState({
      accessToken: makeToken(now - 60),
      refreshToken: "refresh-token",
      user: { id: 1, email: "user@example.com", name: "Demo User", is_staff: false },
    });

    await apiClient.post("/auth/register/", {}, {
      adapter: async (config) => ({
        config,
        data: {},
        headers: {},
        status: 200,
        statusText: "OK",
      }),
    });

    expect(postSpy).not.toHaveBeenCalledWith(expect.stringContaining("/auth/refresh/"), expect.anything());
  });
});
