import { resolveRecommendationConfidence } from "../features/recommendations/api";

describe("resolveRecommendationConfidence", () => {
  it("uses the match score for legacy recommendations", () => {
    expect(resolveRecommendationConfidence({ confidence_score: 0, score: 0.63, score_breakdown: {} })).toBe(0.63);
  });

  it("preserves a calculated zero confidence", () => {
    expect(resolveRecommendationConfidence({
      confidence_score: 0,
      score: 0.63,
      score_breakdown: { content_based_score: 0, safety_score: 1 },
    })).toBe(0);
  });
});
