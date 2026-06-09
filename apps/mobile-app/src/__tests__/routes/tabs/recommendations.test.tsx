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
  resolveRecommendationConfidence: jest.fn((item) => item.confidence_score || item.score || 0),
  resolveRecommendationSynergy: jest.fn((item) => item.score_breakdown?.supplement_score ?? item.score_breakdown?.nutrient_synergy_score ?? item.nutrient_score ?? 0),
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

  it("uses the match score for legacy recommendations without calculated confidence", () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: [{
        run_id: "run-1",
        created_at: "2026-05-08T12:00:00Z",
        disclaimer: "Disclaimer",
        items: [{
          id: 1,
          score: 0.63,
          confidence_score: 0,
          score_breakdown: {},
          nutrient_score: 0.5,
          food: { id: 1, name: "Broccoli", slug: "broccoli", category: "Vegetables", image_path: "" },
          matched_supplement: null,
          explanation: "Legacy recommendation",
        }],
      }],
      isError: false,
      isLoading: false,
    });

    render(<RecommendationsScreen />);

    expect(screen.getByText("63% confidence")).toBeTruthy();
  });

  it("generates recommendations and opens the new run", async () => {
    const { queueRecommendationGeneration } = require("../../../features/recommendations/api");
    (useQuery as jest.Mock).mockReturnValue({ data: [], isError: false, isLoading: false });

    render(<RecommendationsScreen />);
    fireEvent.press(screen.getByLabelText("Generate recommendations"));

    await waitFor(() => {
      expect(queueRecommendationGeneration).toHaveBeenCalledWith(10);
      expect((useQuery as jest.Mock).mock.calls.some(([options]) => (
        options.queryKey?.[0] === "recommendation-history" && options.refetchInterval === 3000
      ))).toBe(true);
    });
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
