import { fireEvent, render, screen } from "@testing-library/react-native";
import { RecommendationCard } from "../../components/ui";

describe("RecommendationCard explainability", () => {
  it("renders confidence, warnings, expandable reasons, score breakdown, and feedback", () => {
    const onFeedback = jest.fn();
    render(
      <RecommendationCard
        category="Vegetables"
        confidenceLabel="High"
        explanation={{
          summary: "Spinach is recommended because vitamin C may support iron absorption.",
          reasons: [{ type: "nutrient_synergy", title: "Vitamin C + Iron", message: "Vitamin C may improve non-heme iron absorption.", confidence: 0.91 }],
        }}
        foodName="Spinach"
        nutrients={["Iron-rich"]}
        onFeedback={onFeedback}
        score={0.91}
        scoreBreakdown={{ nutrient_synergy_score: 0.9, safety_score: 1 }}
        warnings={[{ level: "caution", type: "timing", title: "Avoid calcium", message: "Calcium may reduce iron absorption." }]}
      />,
    );

    expect(screen.getByText("Spinach")).toBeTruthy();
    expect(screen.getByText("91%")).toBeTruthy();
    expect(screen.getByText("Avoid calcium")).toBeTruthy();
    expect(screen.getByText("Synergy")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Toggle recommendation explanation"));
    expect(screen.getByText("Vitamin C may improve non-heme iron absorption.")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Like"));
    expect(onFeedback).toHaveBeenCalledWith("liked");
  });
});
