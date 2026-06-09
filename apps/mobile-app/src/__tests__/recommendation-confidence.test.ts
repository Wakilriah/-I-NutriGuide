import { resolveRecommendationConfidence, resolveRecommendationSynergy } from "../features/recommendations/api";

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

describe("resolveRecommendationSynergy", () => {
  it("uses the PDF supplement score before interaction evidence", () => {
    expect(resolveRecommendationSynergy({
      nutrient_score: 0.7,
      score_breakdown: { supplement_score: 0.42, nutrient_synergy_score: 0.9 },
    })).toBe(0.42);
  });

  it("preserves a calculated zero supplement score", () => {
    expect(resolveRecommendationSynergy({
      nutrient_score: 0.7,
      score_breakdown: { supplement_score: 0, nutrient_synergy_score: 0.9 },
    })).toBe(0);
  });

  it("falls back for legacy recommendation items", () => {
    expect(resolveRecommendationSynergy({
      nutrient_score: 0.63,
      score_breakdown: { nutrient_synergy_score: 0.65 },
    })).toBe(0.65);
  });
});
