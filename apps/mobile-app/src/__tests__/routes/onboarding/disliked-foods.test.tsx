import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import DislikedFoodsOnboardingScreen from "../../../../app/onboarding/disliked-foods";
import { renderWithClient } from "../../../test/render";
import { useAuthStore } from "../../../stores/auth-store";

jest.mock("../../../features/foods/api", () => ({
  searchFoods: jest.fn(async () => [
    { id: 1, name: "Broccoli", slug: "broccoli", category: "Vegetables", serving_size_g: "100", nutrients: [] },
    { id: 2, name: "Mushrooms", slug: "mushrooms", category: "Vegetables", serving_size_g: "100", nutrients: [] },
  ]),
}));

jest.mock("../../../features/profile/api", () => ({
  getProfile: jest.fn(async () => ({ disliked_foods: [] })),
  updateProfile: jest.fn(async () => ({})),
}));

describe("DislikedFoodsOnboardingScreen", () => {
  afterEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ profileComplete: false });
  });

  it("searches and saves selected disliked foods", async () => {
    const { updateProfile } = require("../../../features/profile/api");
    renderWithClient(<DislikedFoodsOnboardingScreen />);

    fireEvent.changeText(screen.getByLabelText("Search"), "bro");
    expect(await screen.findByText("Broccoli")).toBeTruthy();

    fireEvent.press(screen.getByText("Broccoli"));
    fireEvent.press(screen.getByLabelText("Get Started"));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({ disliked_foods: ["Broccoli"] });
    });
    expect(useAuthStore.getState().profileComplete).toBe(true);
  });

  it("allows users to finish without disliked foods", async () => {
    renderWithClient(<DislikedFoodsOnboardingScreen />);

    fireEvent.press(screen.getByText("SKIP FOR NOW"));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/tabs/home");
    });
  });
});
