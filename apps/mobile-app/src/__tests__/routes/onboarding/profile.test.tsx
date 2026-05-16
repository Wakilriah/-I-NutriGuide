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

  it("validates required profile basics", async () => {
    render(<ProfileOnboardingScreen />);

    fireEvent.press(screen.getByLabelText("Save profile basics"));

    expect(await screen.findByText("Age is required.")).toBeTruthy();
    expect(await screen.findByText("Select a gender option.")).toBeTruthy();
    expect(await screen.findByText("Height is required.")).toBeTruthy();
    expect(await screen.findByText("Weight is required.")).toBeTruthy();
  });

  it("saves profile basics", async () => {
    const { updateProfile } = require("../../../features/profile/api");
    render(<ProfileOnboardingScreen />);

    fireEvent.changeText(screen.getByLabelText("Age"), "33");
    fireEvent.press(screen.getByLabelText("Gender: Female"));
    fireEvent.changeText(screen.getByLabelText("Height cm"), "168");
    fireEvent.changeText(screen.getByLabelText("Weight kg"), "64");
    fireEvent.press(screen.getByLabelText("Save profile basics"));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({ age: 33, gender: "female", height_cm: 168, weight_kg: 64 });
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

    expect(await screen.findByDisplayValue("41")).toBeTruthy();
    expect(screen.getByText("Male")).toBeTruthy();
    expect(screen.getByDisplayValue("181.00")).toBeTruthy();
    expect(screen.getByDisplayValue("82.50")).toBeTruthy();
  });
});
