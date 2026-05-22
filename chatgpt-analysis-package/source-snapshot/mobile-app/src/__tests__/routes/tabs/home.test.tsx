import { useMutation, useQuery } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import HomeScreen from "../../../../app/tabs/home";

jest.mock("../../../features/recommendations/api", () => ({
  generateRecommendations: jest.fn(async () => ({ run_id: "run-new", created_at: "2026-05-08T12:00:00Z", disclaimer: "", items: [] })),
  listRecommendationHistory: jest.fn(),
}));

jest.mock("../../../features/supplements/api", () => ({
  listUserSupplements: jest.fn(),
}));

jest.mock("../../../stores/auth-store", () => ({
  useAuthStore: jest.fn((selector) => selector({ user: { name: "Amina" } })),
}));

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn(),
  useQueryClient: () => ({ invalidateQueries: jest.fn(async () => undefined) }),
}));

const supplement = {
  id: 7,
  supplement: { id: 1, name: "Vitamin D", slug: "vitamin-d", description: "", common_dose: "", is_active: true },
  dose: "1000 IU",
  frequency: "daily",
  time_of_day: "morning",
  active: true,
};

const recommendationRun = {
  run_id: "run-1",
  created_at: "2026-05-08T12:00:00Z",
  disclaimer: "",
  items: [
    {
      id: 11,
      run_id: "run-1",
      rank: 1,
      food: { id: 5, name: "Citrus yogurt bowl", slug: "citrus-yogurt-bowl", category: "Breakfast" },
      matched_supplement: { id: 1, name: "Vitamin D", slug: "vitamin-d" },
      score: "0.92",
      nutrient_score: "0.90",
      rule_score: "0.90",
      preference_score: "0.94",
      matched_nutrients: ["calcium"],
      tags: ["protein"],
      warnings: [],
      explanation: "Balanced breakfast pairing.",
    },
  ],
};

describe("HomeScreen", () => {
  beforeEach(() => {
    (useMutation as jest.Mock).mockImplementation((options) => ({
      isError: false,
      isPending: false,
      mutate: async () => {
        const run = await options.mutationFn();
        options.onSuccess?.(run, undefined, undefined);
      },
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows the polished home summary with routine and latest match", () => {
    (useQuery as jest.Mock).mockImplementation(({ queryKey }) => {
      if (queryKey[0] === "user-supplements") {
        return { data: [supplement], isError: false, isLoading: false };
      }
      return { data: [recommendationRun], isError: false, isLoading: false };
    });

    render(<HomeScreen />);

    expect(screen.getByText("Hi Amina")).toBeTruthy();
    expect(screen.getByText("Today's routine")).toBeTruthy();
    expect(screen.getByText("Vitamin D")).toBeTruthy();
    expect(screen.getByText("Best match now")).toBeTruthy();
    expect(screen.getByText("Citrus yogurt bowl")).toBeTruthy();
  });

  it("generates a recommendation when no latest run exists", async () => {
    const { generateRecommendations } = require("../../../features/recommendations/api");
    (useQuery as jest.Mock).mockImplementation(({ queryKey }) => {
      if (queryKey[0] === "user-supplements") {
        return { data: [supplement], isError: false, isLoading: false };
      }
      return { data: [], isError: false, isLoading: false };
    });

    render(<HomeScreen />);
    fireEvent.press(screen.getByLabelText("Generate today's match"));

    expect(generateRecommendations).toHaveBeenCalledWith(10);
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/recommendations/run-new");
    });
  });
});
