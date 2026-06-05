import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import ForgotPasswordScreen from "../../../../app/auth/forgot-password";

jest.mock("../../../features/auth/api", () => ({
  requestPasswordReset: jest.fn(async () => ({
    detail: "If an account exists for this email, we sent a password reset code.",
  })),
}));

describe("ForgotPasswordScreen", () => {
  it("validates email", async () => {
    render(<ForgotPasswordScreen />);

    fireEvent.press(screen.getByLabelText("Send password reset code"));

    expect(await screen.findByText("Enter a valid email.")).toBeTruthy();
  });

  it("requests reset code and routes to reset screen", async () => {
    const { requestPasswordReset } = require("../../../features/auth/api");
    render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByLabelText("Reset email"), " User@Example.COM ");
    fireEvent.press(screen.getByLabelText("Send password reset code"));

    await waitFor(() => {
      expect(requestPasswordReset).toHaveBeenCalledWith({ email: "user@example.com" });
      expect(router.push).toHaveBeenCalledWith({ pathname: "/auth/reset-password", params: { email: "user@example.com" } });
    });
  });
});
