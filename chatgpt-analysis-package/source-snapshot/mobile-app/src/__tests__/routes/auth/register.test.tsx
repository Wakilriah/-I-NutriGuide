import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import RegisterScreen from "../../../../app/auth/register";
import { useAuthStore } from "../../../stores/auth-store";

jest.mock("../../../features/auth/api", () => ({
  register: jest.fn(async () => ({
    access: "access-token",
    refresh: "refresh-token",
    user: { id: 2, email: "new@example.com", name: "New User", is_staff: false },
  })),
}));

describe("RegisterScreen", () => {
  it("validates required account details", async () => {
    render(<RegisterScreen />);

    fireEvent.press(screen.getByLabelText("Submit registration"));

    expect(await screen.findByText("Name is required.")).toBeTruthy();
    expect(await screen.findByText("Enter a valid email.")).toBeTruthy();
    expect(await screen.findByText("Password must be at least 8 characters.")).toBeTruthy();
    expect(await screen.findByText("Confirm password must be at least 8 characters.")).toBeTruthy();
  });

  it("requires matching passwords", async () => {
    render(<RegisterScreen />);

    fireEvent.changeText(screen.getByLabelText("name"), "New User");
    fireEvent.changeText(screen.getByLabelText("email"), "new@example.com");
    fireEvent.changeText(screen.getByLabelText("password"), "StrongPassword123");
    fireEvent.changeText(screen.getByLabelText("password2"), "DifferentPassword123");
    fireEvent.press(screen.getByLabelText("Submit registration"));

    expect(await screen.findByText("Passwords must match.")).toBeTruthy();
  });

  it("submits valid registration details", async () => {
    const { register } = require("../../../features/auth/api");
    render(<RegisterScreen />);

    expect(screen.getByText("Already have an account? Sign in")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("name"), "  New User  ");
    fireEvent.changeText(screen.getByLabelText("email"), " New@Example.COM ");
    fireEvent.changeText(screen.getByLabelText("password"), "StrongPassword123");
    fireEvent.changeText(screen.getByLabelText("password2"), "StrongPassword123");
    fireEvent.press(screen.getByLabelText("Submit registration"));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith({
        name: "New User",
        email: "new@example.com",
        password: "StrongPassword123",
      });
    });
    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBe("access-token");
      expect(router.replace).toHaveBeenCalledWith("/onboarding/profile");
    });
  });

  it("shows the duplicate email message from the API", async () => {
    const { register } = require("../../../features/auth/api");
    register.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        data: {
          email: ["A user with this email already exists."],
        },
      },
    });

    render(<RegisterScreen />);

    fireEvent.changeText(screen.getByLabelText("name"), "New User");
    fireEvent.changeText(screen.getByLabelText("email"), "used@example.com");
    fireEvent.changeText(screen.getByLabelText("password"), "StrongPassword123");
    fireEvent.changeText(screen.getByLabelText("password2"), "StrongPassword123");
    fireEvent.press(screen.getByLabelText("Submit registration"));

    expect(await screen.findByText("A user with this email already exists.")).toBeTruthy();
  });

  it("shows a clear message when the API is unreachable", async () => {
    const { register } = require("../../../features/auth/api");
    register.mockRejectedValueOnce({
      isAxiosError: true,
      request: {},
    });

    render(<RegisterScreen />);

    fireEvent.changeText(screen.getByLabelText("name"), "New User");
    fireEvent.changeText(screen.getByLabelText("email"), "new@example.com");
    fireEvent.changeText(screen.getByLabelText("password"), "StrongPassword123");
    fireEvent.changeText(screen.getByLabelText("password2"), "StrongPassword123");
    fireEvent.press(screen.getByLabelText("Submit registration"));

    expect(await screen.findByText("Cannot reach the API. Make sure the backend is running and your phone is on the same Wi-Fi.")).toBeTruthy();
  });

  it("toggles password visibility", () => {
    render(<RegisterScreen />);

    fireEvent.press(screen.getByLabelText("Show passwords"));

    expect(screen.getByLabelText("Hide passwords")).toBeTruthy();
  });
});
