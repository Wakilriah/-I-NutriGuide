import { act, cleanup, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import OnboardingLayout from "../../../../app/onboarding/_layout";
import RecommendationsLayout from "../../../../app/recommendations/_layout";
import SupplementsLayout from "../../../../app/supplements/_layout";
import TabsLayout from "../../../../app/tabs/_layout";
import { useAuthStore } from "../../../stores/auth-store";

describe("protected route layouts", () => {
  afterEach(() => {
    cleanup();
    act(() => {
      useAuthStore.setState({ accessToken: null, refreshToken: null, user: null, hasHydrated: false, profileComplete: null });
    });
    jest.clearAllMocks();
  });

  it("waits while auth is hydrating", () => {
    act(() => {
      useAuthStore.setState({ hasHydrated: false });
    });

    render(<TabsLayout />);

    expect(screen.getByText("Loading session...")).toBeTruthy();
  });

  it("redirects logged-out users after hydration", async () => {
    act(() => {
      useAuthStore.setState({ accessToken: null, refreshToken: null, user: null, hasHydrated: true, profileComplete: null });
    });

    render(<TabsLayout />);

    expect(screen.getByText("Redirecting...")).toBeTruthy();
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/");
    });
  });

  it.each([
    ["tabs", TabsLayout],
    ["onboarding", OnboardingLayout],
    ["supplements", SupplementsLayout],
    ["recommendations", RecommendationsLayout],
  ])("protects the %s route group", async (_name, Layout) => {
    act(() => {
      useAuthStore.setState({ accessToken: null, refreshToken: null, user: null, hasHydrated: true, profileComplete: null });
    });

    render(<Layout />);

    expect(screen.getByText("Redirecting...")).toBeTruthy();
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/");
    });
    jest.clearAllMocks();
  });

  it("holds main app routes until profile completion is known", () => {
    act(() => {
      useAuthStore.setState({ accessToken: "access-token", refreshToken: "refresh-token", user: null, hasHydrated: true, profileComplete: null });
    });

    render(<TabsLayout />);

    expect(screen.getByText("Loading profile...")).toBeTruthy();
  });

  it("redirects incomplete profiles away from main app routes", async () => {
    act(() => {
      useAuthStore.setState({ accessToken: "access-token", refreshToken: "refresh-token", user: null, hasHydrated: true, profileComplete: false });
    });

    render(<TabsLayout />);

    expect(screen.getByText("Redirecting...")).toBeTruthy();
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/onboarding/profile");
    });
  });

  it("allows incomplete profiles to use onboarding routes", () => {
    act(() => {
      useAuthStore.setState({ accessToken: "access-token", refreshToken: "refresh-token", user: null, hasHydrated: true, profileComplete: false });
    });

    render(<OnboardingLayout />);

    expect(screen.queryByText("Redirecting...")).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("redirects completed profiles away from onboarding routes", async () => {
    act(() => {
      useAuthStore.setState({ accessToken: "access-token", refreshToken: "refresh-token", user: null, hasHydrated: true, profileComplete: true });
    });

    render(<OnboardingLayout />);

    expect(screen.getByText("Redirecting...")).toBeTruthy();
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/tabs/home");
    });
  });
});
