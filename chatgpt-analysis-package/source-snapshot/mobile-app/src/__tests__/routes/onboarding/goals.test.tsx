import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import GoalOnboardingScreen from "../../../../app/onboarding/goals";
import { useAuthStore } from "../../../stores/auth-store";

jest.mock("../../../features/profile/api", () => ({
  getProfile: jest.fn(async () => ({
    activity_level: "",
    diet_type: "",
    disliked_foods: [],
    goal: "",
  })),
  parseCommaList: jest.requireActual("../../../features/profile/api").parseCommaList,
  updateProfile: jest.fn(async () => ({})),
}));

describe("GoalOnboardingScreen", () => {
  afterEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ profileComplete: false });
  });

  it("validates required goal context", async () => {
    render(<GoalOnboardingScreen />);

    fireEvent.press(screen.getByLabelText("Save goals"));

    expect(await screen.findByText("Select an activity level.")).toBeTruthy();
  });

  it("saves goals and preferences", async () => {
    const { updateProfile } = require("../../../features/profile/api");
    render(<GoalOnboardingScreen />);

    fireEvent.press(screen.getByLabelText("Digestive health"));
    fireEvent.press(screen.getByLabelText("Activity level: Moderate"));
    fireEvent.press(screen.getByLabelText("Diet type: Vegetarian"));
    fireEvent.press(screen.getByLabelText("Save goals"));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        goal: "digestive_health",
        activity_level: "moderate",
        diet_type: "vegetarian",
      });
    });
  });

  it("prefills existing goals and preferences", async () => {
    const { getProfile } = require("../../../features/profile/api");
    getProfile.mockResolvedValueOnce({
      activity_level: "active",
      diet_type: "vegetarian",
      disliked_foods: ["soda", "mushrooms"],
      goal: "digestive_health",
    });

    render(<GoalOnboardingScreen />);

    expect(await screen.findByText("Digestive health")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByText("Vegetarian")).toBeTruthy();
  });
});
