import { useMutation, useQuery } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";
import RecommendationDetailScreen from "../../../../app/recommendations/[runId]";

jest.mock("../../../features/recommendations/api", () => ({
  getRecommendationRun: jest.fn(),
  saveRecommendationItem: jest.fn(async () => ({})),
  submitRecommendationFeedback: jest.fn(async () => ({})),
}));

jest.mock("../../../features/profile/api", () => ({
  getProfile: jest.fn(async () => ({ disliked_foods: [] })),
  updateProfile: jest.fn(async () => ({})),
}));

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn(),
}));

const run = {
  run_id: "run-1",
  created_at: "2026-05-08T12:00:00Z",
  disclaimer: "This is educational and not medical advice.",
  items: [
    {
      id: 11,
      rank: 1,
      food: { id: 5, name: "Spinach", slug: "spinach", category: "Vegetables" },
      matched_supplement: { id: 3, name: "Iron", slug: "iron" },
      score: "0.900",
      nutrient_score: "0.800",
      rule_score: "0.700",
      preference_score: "0.600",
      matched_nutrients: ["iron"],
      tags: ["high-fiber"],
      warnings: ["Check supplement timing"],
      explanation: "Spinach fits your current supplement routine.",
    },
  ],
};

describe("RecommendationDetailScreen", () => {
  beforeEach(() => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ runId: "run-1" });
    (useQuery as jest.Mock).mockReturnValue({ data: run, isError: false, isLoading: false });
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

  it("shows explanation, disclaimer, tags, and warnings", () => {
    render(<RecommendationDetailScreen />);

    expect(screen.getByText("This is educational and not medical advice.")).toBeTruthy();
    expect(screen.getByText("Spinach")).toBeTruthy();
    expect(screen.getByText("Spinach fits your current supplement routine.")).toBeTruthy();
    expect(screen.getByText("Tags: high-fiber")).toBeTruthy();
    expect(screen.getByText("Warnings: Check supplement timing")).toBeTruthy();
    expect(screen.getByText("Feedback")).toBeTruthy();
  });

  it("shows an empty run message", () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { ...run, items: [] },
      isError: false,
      isLoading: false,
    });

    render(<RecommendationDetailScreen />);

    expect(screen.getByText("No recommendation items were saved for this run.")).toBeTruthy();
  });

  it("submits item feedback", async () => {
    const { submitRecommendationFeedback } = require("../../../features/recommendations/api");
    render(<RecommendationDetailScreen />);

    fireEvent.changeText(screen.getByLabelText("Rating for Spinach"), "4");
    fireEvent.changeText(screen.getByLabelText("Comment for Spinach"), "Helpful");
    fireEvent.press(screen.getByLabelText("Submit feedback for Spinach"));

    await waitFor(() => {
      expect(submitRecommendationFeedback).toHaveBeenCalledWith({
        recommendation_item_id: 11,
        rating: 4,
        is_helpful: true,
        comment: "Helpful",
      });
      expect(screen.getByText("Feedback saved.")).toBeTruthy();
    });
  });

  it("saves a recommendation item from the quick action", async () => {
    const { saveRecommendationItem } = require("../../../features/recommendations/api");
    render(<RecommendationDetailScreen />);

    fireEvent.press(screen.getByLabelText("Save"));

    await waitFor(() => {
      expect(saveRecommendationItem).toHaveBeenCalledWith(11);
      expect(screen.getByText("Saved to your foods.")).toBeTruthy();
    });
  });
});
