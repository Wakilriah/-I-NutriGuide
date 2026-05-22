import { act, cleanup, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import WelcomeScreen from "../../../app/index";
import AuthLayout from "../../../app/auth/_layout";
import { useAuthStore } from "../../stores/auth-store";

describe("WelcomeScreen", () => {
  afterEach(() => {
    cleanup();
    act(() => {
      useAuthStore.setState({ accessToken: null, refreshToken: null, user: null, hasHydrated: false });
    });
    jest.clearAllMocks();
  });

  it("shows the mobile entry actions", () => {
    act(() => {
      useAuthStore.setState({ accessToken: null, refreshToken: null, user: null, hasHydrated: true });
    });

    render(<WelcomeScreen />);

    expect(screen.getByText("I-NutriGuide")).toBeTruthy();
    expect(screen.getByText("Sign in")).toBeTruthy();
    expect(screen.getByText("Create an account")).toBeTruthy();
  });

  it("redirects signed-in users away from the welcome screen", async () => {
    act(() => {
      useAuthStore.setState({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: { id: 1, email: "user@example.com", name: "Demo User", is_staff: false },
        hasHydrated: true,
      });
    });

    render(<WelcomeScreen />);

    expect(screen.getByText("Redirecting...")).toBeTruthy();
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/tabs/home");
    });
  });

  it("redirects signed-in users away from auth screens", async () => {
    act(() => {
      useAuthStore.setState({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: { id: 1, email: "user@example.com", name: "Demo User", is_staff: false },
        hasHydrated: true,
      });
    });

    render(<AuthLayout />);

    expect(screen.getByText("Redirecting...")).toBeTruthy();
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/tabs/home");
    });
  });
});
