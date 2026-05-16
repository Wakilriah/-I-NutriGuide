import { useMutation, useQuery } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import ProfileScreen from "../../../../app/tabs/profile";
import { useAuthStore } from "../../../stores/auth-store";

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn(),
  useQueryClient: () => ({ invalidateQueries: jest.fn(async () => undefined) }),
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

const mockUseQuery = useQuery as jest.Mock;
const mockUseMutation = useMutation as jest.Mock;

describe("ProfileScreen", () => {
  beforeEach(() => {
    mockUseQuery.mockImplementation(({ queryKey }) => {
      if (queryKey[0] === "profile") {
        return { data: profile, isError: false, isLoading: false };
      }
      return {
        data: [{ id: 2, name: "Broccoli", slug: "broccoli", category: "Vegetables" }],
        isError: false,
        isLoading: false,
      };
    });
    mockUseMutation.mockImplementation((options) => ({
      isPending: false,
      mutate: async (payload: unknown) => {
        const result = await options.mutationFn(payload);
        options.onSuccess?.(result, payload, undefined);
      },
    }));

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

  it("shows editable saved profile details", () => {
    render(<ProfileScreen />);

    expect(screen.getByText("Demo User")).toBeTruthy();
    expect(screen.getByText("user@example.com")).toBeTruthy();
    expect(screen.getByDisplayValue("32")).toBeTruthy();
    expect(screen.getByDisplayValue("62.50")).toBeTruthy();
    expect(screen.getByDisplayValue("peanuts")).toBeTruthy();
    expect(screen.getByText("mushrooms")).toBeTruthy();
  });

  it("saves profile changes in place", async () => {
    const { updateProfile } = require("../../../features/profile/api");
    render(<ProfileScreen />);

    fireEvent.changeText(screen.getByLabelText("Weight kg"), "64");
    fireEvent.press(screen.getByLabelText("Goal: Energy"));
    fireEvent.press(screen.getByLabelText("Save profile changes"));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          weight_kg: 64,
          goal: "energy",
          disliked_foods: ["mushrooms"],
        }),
      );
      expect(screen.getByText("Profile updated.")).toBeTruthy();
    });
  });

  it("adds disliked foods from profile search", async () => {
    const { updateProfile } = require("../../../features/profile/api");
    render(<ProfileScreen />);

    fireEvent.changeText(screen.getByLabelText("Search"), "bro");
    fireEvent.press(screen.getByLabelText("Add disliked food Broccoli"));
    fireEvent.press(screen.getByLabelText("Save profile changes"));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ disliked_foods: ["mushrooms", "Broccoli"] }));
    });
  });

  it("logs out and returns to welcome", async () => {
    render(<ProfileScreen />);

    expect(screen.getByText("user@example.com")).toBeTruthy();
    fireEvent.press(screen.getByText("Log out"));

    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(router.replace).toHaveBeenCalledWith("/");
    });
  });
});
