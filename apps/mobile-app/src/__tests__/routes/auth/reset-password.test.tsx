import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import ResetPasswordScreen from "../../../../app/auth/reset-password";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ email: "user@example.com" }),
}));

jest.mock("../../../features/auth/api", () => ({
  confirmPasswordReset: jest.fn(async () => ({ detail: "Your password has been reset. You can sign in now." })),
  requestPasswordReset: jest.fn(async () => ({ detail: "If an account exists for this email, we sent a password reset code." })),
}));

describe("ResetPasswordScreen", () => {
  it("requires matching passwords", async () => {
    render(<ResetPasswordScreen />);

    fireEvent.changeText(screen.getByLabelText("Password reset code"), "123456");
    fireEvent.changeText(screen.getByLabelText("New password"), "StrongPassword123");
    fireEvent.changeText(screen.getByLabelText("Confirm new password"), "DifferentPassword123");
    fireEvent.press(screen.getByLabelText("Reset password"));

    expect(await screen.findByText("Passwords must match.")).toBeTruthy();
  });

  it("confirms password reset and routes to login", async () => {
    const { confirmPasswordReset } = require("../../../features/auth/api");
    render(<ResetPasswordScreen />);

    fireEvent.changeText(screen.getByLabelText("Password reset code"), "123456");
    fireEvent.changeText(screen.getByLabelText("New password"), "StrongPassword123");
    fireEvent.changeText(screen.getByLabelText("Confirm new password"), "StrongPassword123");
    fireEvent.press(screen.getByLabelText("Reset password"));

    await waitFor(() => {
      expect(confirmPasswordReset).toHaveBeenCalledWith({
        email: "user@example.com",
        code: "123456",
        password: "StrongPassword123",
      });
      expect(router.replace).toHaveBeenCalledWith("/auth/login");
    });
  });
});
