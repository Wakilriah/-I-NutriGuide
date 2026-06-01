import { useQuery } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import ProfileScreen from "../../../../app/tabs/profile";
import { useAuthStore } from "../../../stores/auth-store";

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
}));

const profile = {
  age: 32,
  gender: "female",
  height_cm: "165.00",
  weight_kg: "62.50",
  goal: "general_health",
  activity_level: "moderate",
  diet_type: "mediterranean",
  allergies: ["peanuts"],
  dietary_restrictions: ["halal"],
  disliked_foods: ["mushrooms"],
};

jest.mock("../../../features/foods/api", () => ({
  searchFoods: jest.fn(async () => [{ id: 2, name: "Broccoli", slug: "broccoli", category: "Vegetables" }]),
}));

jest.mock("../../../features/profile/api", () => ({
  getProfile: jest.fn(async () => profile),
  parseCommaList: jest.requireActual("../../../features/profile/api").parseCommaList,
  updateProfile: jest.fn(async () => profile),
}));

jest.mock("../../../features/tracking/api", () => ({
  listTrackingHistory: jest.fn(async () => []),
}));

const mockUseQuery = useQuery as jest.Mock;
describe("ProfileScreen", () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({ data: profile, isError: false, isLoading: false });

    useAuthStore.setState({
      accessToken: "access-token",
      hasHydrated: true,
      profileComplete: true,
      refreshToken: "refresh-token",
      user: { id: 1, email: "user@example.com", name: "Demo User", is_staff: false },
    });
  });

  afterEach(() => {
    cleanup();
    useAuthStore.setState({
      accessToken: null,
      hasHydrated: false,
      profileComplete: false,
      refreshToken: null,
      user: null,
    });
    jest.clearAllMocks();
  });

  it("shows account details and profile shortcuts", () => {
    render(<ProfileScreen />);

    expect(screen.getAllByText("Demo User").length).toBeGreaterThan(0);
    expect(screen.getAllByText("user@example.com").length).toBeGreaterThan(0);
    expect(screen.getByText("general health")).toBeTruthy();
    expect(screen.getByText("Personal info")).toBeTruthy();
    expect(screen.getByText("Graphs and statistics")).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.getByText("Notification history")).toBeTruthy();
  });

  it("logs out and returns to welcome", async () => {
    render(<ProfileScreen />);

    expect(screen.getAllByText("user@example.com").length).toBeGreaterThan(0);
    fireEvent.press(screen.getByText("Log out"));

    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(router.replace).toHaveBeenCalledWith("/");
    });
  });
});
