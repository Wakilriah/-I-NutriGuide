import { useMutation, useQuery } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import RecommendationsScreen from "../../../../app/tabs/recommendations";

jest.mock("../../../features/recommendations/api", () => ({
  getMealPlan: jest.fn(async () => ({ meals: null })),
  getTimingPlan: jest.fn(async () => ({ items: [] })),
  listRecommendationHistory: jest.fn(),
  queueRecommendationGeneration: jest.fn(async () => ({ run_id: "run-1", created_at: "2026-05-08T12:00:00Z", disclaimer: "", items: [] })),
  resolveFoodImageUri: jest.fn(() => "https://example.com/food.webp"),
}));

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn(),
  useQueryClient: () => ({ invalidateQueries: jest.fn(async () => undefined) }),
}));

describe("RecommendationsScreen", () => {
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

  it("shows an empty recommendation history", () => {
    (useQuery as jest.Mock).mockReturnValue({ data: [], isError: false, isLoading: false });

    render(<RecommendationsScreen />);

    expect(screen.getByText("No recommendations generated yet.")).toBeTruthy();
  });

  it("shows recommendation history", () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: [{ run_id: "run-1", created_at: "2026-05-08T12:00:00Z", disclaimer: "Disclaimer", items: [{ id: 1 }] }],
      isError: false,
      isLoading: false,
    });

    render(<RecommendationsScreen />);

    expect(screen.getByText("1 food recommendations")).toBeTruthy();
  });

  it("generates recommendations and opens the new run", async () => {
    const { queueRecommendationGeneration } = require("../../../features/recommendations/api");
    (useQuery as jest.Mock).mockReturnValue({ data: [], isError: false, isLoading: false });

    render(<RecommendationsScreen />);
    fireEvent.press(screen.getByLabelText("Generate recommendations"));

    expect(queueRecommendationGeneration).toHaveBeenCalledWith(10);
  });

  it("shows a generate error message", () => {
    (useMutation as jest.Mock).mockReturnValue({
      isError: true,
      isPending: false,
      mutate: jest.fn(),
    });
    (useQuery as jest.Mock).mockReturnValue({ data: [], isError: false, isLoading: false });

    render(<RecommendationsScreen />);

    expect(screen.getByText("Unable to generate recommendations. Please try again.")).toBeTruthy();
  });
});
