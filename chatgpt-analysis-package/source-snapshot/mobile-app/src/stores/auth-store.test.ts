import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "./auth-store";

describe("auth store", () => {
  afterEach(async () => {
    await useAuthStore.getState().clearSession();
    jest.clearAllMocks();
  });

  it("persists and clears session tokens", async () => {
    await useAuthStore.getState().setSession({
      access: "access-token",
      refresh: "refresh-token",
      user: { id: 1, email: "user@example.com", name: "Demo User", is_staff: false },
    });

    expect(useAuthStore.getState().accessToken).toBe("access-token");
    expect(useAuthStore.getState().hasHydrated).toBe(true);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "inutriguide-mobile-session",
      JSON.stringify({ access: "access-token", refresh: "refresh-token" }),
    );

    await useAuthStore.getState().clearSession();

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().hasHydrated).toBe(true);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("inutriguide-mobile-session");
  });

  it("updates a refreshed access token without losing the refresh token", async () => {
    useAuthStore.setState({
      accessToken: "expired-access-token",
      refreshToken: "refresh-token",
      user: { id: 1, email: "user@example.com", name: "Demo User", is_staff: false },
    });

    await useAuthStore.getState().updateAccessToken("fresh-access-token");

    expect(useAuthStore.getState().accessToken).toBe("fresh-access-token");
    expect(useAuthStore.getState().refreshToken).toBe("refresh-token");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "inutriguide-mobile-session",
      JSON.stringify({ access: "fresh-access-token", refresh: "refresh-token" }),
    );
  });

  it("hydrates persisted tokens and restores the user", () => {
    useAuthStore.getState().hydrateSession({ access: "stored-access-token", refresh: "stored-refresh-token" });
    useAuthStore.getState().setUser({ id: 3, email: "restored@example.com", name: "Restored User", is_staff: false });

    expect(useAuthStore.getState().accessToken).toBe("stored-access-token");
    expect(useAuthStore.getState().refreshToken).toBe("stored-refresh-token");
    expect(useAuthStore.getState().user?.email).toBe("restored@example.com");
    useAuthStore.getState().finishHydration();
    expect(useAuthStore.getState().hasHydrated).toBe(true);
  });
});
