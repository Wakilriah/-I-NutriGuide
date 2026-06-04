import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import ProfileOnboardingScreen from "../../../../app/onboarding/profile";

jest.mock("../../../features/profile/api", () => ({
  getProfile: jest.fn(async () => ({
    age: null,
    gender: "",
    height_cm: null,
    weight_kg: null,
  })),
  updateProfile: jest.fn(async () => ({})),
}));

describe("ProfileOnboardingScreen", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("validates required gender choice", async () => {
    render(<ProfileOnboardingScreen />);

    fireEvent.press(screen.getByLabelText("Save profile basics"));

    expect(await screen.findByText("Select a gender option.")).toBeTruthy();
  });

  it("saves profile basics", async () => {
    const { updateProfile } = require("../../../features/profile/api");
    render(<ProfileOnboardingScreen />);

    fireEvent.press(screen.getByLabelText("Female"));
    fireEvent.press(screen.getByLabelText("Save profile basics"));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({ age: 30, gender: "female", height_cm: 170, weight_kg: 70 });
    });
  });

  it("prefills existing profile basics", async () => {
    const { getProfile } = require("../../../features/profile/api");
    getProfile.mockResolvedValueOnce({
      age: 41,
      gender: "male",
      height_cm: "181.00",
      weight_kg: "82.50",
    });

    render(<ProfileOnboardingScreen />);

    expect(await screen.findByText("41")).toBeTruthy();
    expect(screen.getByText("Male")).toBeTruthy();
    expect(screen.getByText("181")).toBeTruthy();
    expect(screen.getByText("82.5")).toBeTruthy();
  });
});
