import { useMutation, useQuery } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import SavedFoodsScreen from "../../../../app/tabs/saved";

jest.mock("../../../features/recommendations/api", () => ({
  listSavedRecommendationItems: jest.fn(),
  removeSavedRecommendationItem: jest.fn(async () => undefined),
}));

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn(),
  useQueryClient: () => ({ invalidateQueries: jest.fn(async () => undefined) }),
}));

const savedFood = {
  id: 7,
  created_at: "2026-05-13T12:00:00Z",
  recommendation_item: {
    id: 11,
    run_id: "run-1",
    rank: 1,
    food: { id: 5, name: "Spinach", slug: "spinach", category: "Vegetables" },
    matched_supplement: { id: 3, name: "Iron", slug: "iron" },
    score: "0.900",
    nutrient_score: "0.800",
    rule_score: "0.700",
    preference_score: "0.600",
    matched_nutrients: ["iron"],
    tags: ["high-fiber"],
    warnings: [],
    explanation: "Spinach fits your current supplement routine.",
  },
};

describe("SavedFoodsScreen", () => {
  beforeEach(() => {
    (useMutation as jest.Mock).mockImplementation((options) => ({
      isError: false,
      isPending: false,
      mutate: async (payload: unknown) => {
        const result = await options.mutationFn(payload);
        options.onSuccess?.(result, payload, undefined);
      },
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows an empty saved foods state", () => {
    (useQuery as jest.Mock).mockReturnValue({ data: [], isError: false, isLoading: false });

    render(<SavedFoodsScreen />);

    expect(screen.getByText("No saved foods yet")).toBeTruthy();
  });

  it("shows saved foods and opens their recommendation run", () => {
    (useQuery as jest.Mock).mockReturnValue({ data: [savedFood], isError: false, isLoading: false });

    render(<SavedFoodsScreen />);
    fireEvent.press(screen.getByLabelText("Open saved recommendation 11"));

    expect(screen.getAllByText("Spinach").length).toBeGreaterThan(0);
    expect(screen.getByText("1 saved matches")).toBeTruthy();
    expect(router.push).toHaveBeenCalledWith("/recommendations/run-1");
  });

  it("removes a saved food", async () => {
    const { removeSavedRecommendationItem } = require("../../../features/recommendations/api");
    (useQuery as jest.Mock).mockReturnValue({ data: [savedFood], isError: false, isLoading: false });

    render(<SavedFoodsScreen />);
    fireEvent.press(screen.getByLabelText("Remove saved food Spinach"));

    await waitFor(() => {
      expect(removeSavedRecommendationItem).toHaveBeenCalledWith(7);
    });
  });
});
