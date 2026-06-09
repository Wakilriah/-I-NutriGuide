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
        image={{ uri: "http://localhost:8000/media/foods/vegetables/spinach.webp" }}
        imageAlt="Spinach food image"
        matchedRules={[{ antecedent: "supp:iron", consequent: "food:spinach", confidence: 0.82, lift: 1.6, explanation: "Spinach appears with iron in association rules." }]}
        nutrients={["Iron-rich"]}
        onFeedback={onFeedback}
        score={0.91}
        scoreBreakdown={{ supplement_score: 0.42, nutrient_synergy_score: 0.9, safety_score: 1 }}
        synergyReason="Vitamin C support makes this a useful iron pairing."
        warnings={[{ level: "caution", type: "timing", title: "Avoid calcium", message: "Calcium may reduce iron absorption." }]}
      />,
    );

    expect(screen.getByText("Spinach")).toBeTruthy();
    expect(screen.getByLabelText("Spinach food image")).toBeTruthy();
    expect(screen.getByText("91%")).toBeTruthy();
    expect(screen.getByText("Avoid calcium")).toBeTruthy();
    expect(screen.getByText("Supplement connection")).toBeTruthy();
    expect(screen.getByText("Rule confidence 82%, lift 1.60")).toBeTruthy();
    expect(screen.getByText("Vitamin C support makes this a useful iron pairing.")).toBeTruthy();
    expect(screen.getByText("Synergy")).toBeTruthy();
    expect(screen.getAllByText("42%").length).toBeGreaterThan(0);
    expect(screen.getByText("Interaction evidence")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Toggle recommendation explanation"));
    expect(screen.getByText("Vitamin C may improve non-heme iron absorption.")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Like"));
    expect(onFeedback).toHaveBeenCalledWith("liked");
  });
});
