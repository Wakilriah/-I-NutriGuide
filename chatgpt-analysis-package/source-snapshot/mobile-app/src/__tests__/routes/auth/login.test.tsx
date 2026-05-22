import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import LoginScreen from "../../../../app/auth/login";
import { useAuthStore } from "../../../stores/auth-store";

jest.mock("../../../features/auth/api", () => ({
  login: jest.fn(async () => ({
    access: "access-token",
    refresh: "refresh-token",
    user: { id: 1, email: "user@example.com", name: "Demo User", is_staff: false },
  })),
}));

jest.mock("../../../features/profile/api", () => ({
  getProfile: jest.fn(async () => ({
    age: 32,
    gender: "female",
    height_cm: "165.00",
    weight_kg: "62.00",
    goal: "general_health",
    activity_level: "moderate",
    diet_type: "none",
    allergies: [],
    dietary_restrictions: [],
    disliked_foods: [],
  })),
  isProfileComplete: jest.requireActual("../../../features/profile/api").isProfileComplete,
}));

describe("LoginScreen", () => {
  afterEach(() => {
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null, hasHydrated: false, profileComplete: null });
    jest.clearAllMocks();
  });

  it("validates required credentials", async () => {
    render(<LoginScreen />);

    fireEvent.press(screen.getByLabelText("Submit login"));

    expect(await screen.findByText("Enter a valid email.")).toBeTruthy();
    expect(await screen.findByText("Password must be at least 8 characters.")).toBeTruthy();
  });

  it("validates login fields when they lose focus", async () => {
    render(<LoginScreen />);

    fireEvent.changeText(screen.getByLabelText("Email"), "not-an-email");
    fireEvent(screen.getByLabelText("Email"), "blur");
    fireEvent.changeText(screen.getByLabelText("Password"), "short");
    fireEvent(screen.getByLabelText("Password"), "blur");

    expect(await screen.findByText("Enter a valid email.")).toBeTruthy();
    expect(await screen.findByText("Password must be at least 8 characters.")).toBeTruthy();
  });

  it("submits valid credentials", async () => {
    const { login } = require("../../../features/auth/api");
    render(<LoginScreen />);

    fireEvent.changeText(screen.getByLabelText("Email"), " User@Example.COM ");
    fireEvent.changeText(screen.getByLabelText("Password"), "StrongPassword123");
    fireEvent.press(screen.getByLabelText("Submit login"));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({ email: "user@example.com", password: "StrongPassword123" });
    });
    await waitFor(() => {
      expect(useAuthStore.getState().profileComplete).toBe(true);
      expect(router.replace).toHaveBeenCalledWith("/tabs/home");
    });
  });

  it("shows a friendly message when login credentials fail", async () => {
    const { login } = require("../../../features/auth/api");
    login.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { detail: "No active account found with the given credentials" } },
    });

    render(<LoginScreen />);

    fireEvent.changeText(screen.getByLabelText("Email"), "chochito@gmail.com");
    fireEvent.changeText(screen.getByLabelText("Password"), "StrongPassword123");
    fireEvent.press(screen.getByLabelText("Submit login"));

    expect(await screen.findByText("Please verify your email and password and try again.")).toBeTruthy();
    expect(screen.queryByText(/No active account/i)).toBeNull();
  });

  it("toggles password visibility", () => {
    render(<LoginScreen />);

    fireEvent.press(screen.getByLabelText("Show password"));

    expect(screen.getByLabelText("Hide password")).toBeTruthy();
  });

  it("routes users with incomplete profiles to onboarding", async () => {
    const { getProfile } = require("../../../features/profile/api");
    getProfile.mockResolvedValueOnce({
      age: null,
      gender: "",
      height_cm: null,
      weight_kg: null,
      goal: "",
      activity_level: "",
      diet_type: "none",
      allergies: [],
      dietary_restrictions: [],
      disliked_foods: [],
    });

    render(<LoginScreen />);

    fireEvent.changeText(screen.getByLabelText("Email"), "user@example.com");
    fireEvent.changeText(screen.getByLabelText("Password"), "StrongPassword123");
    fireEvent.press(screen.getByLabelText("Submit login"));

    await waitFor(() => {
      expect(useAuthStore.getState().profileComplete).toBe(false);
      expect(router.replace).toHaveBeenCalledWith("/onboarding/profile");
    });
  });
});
