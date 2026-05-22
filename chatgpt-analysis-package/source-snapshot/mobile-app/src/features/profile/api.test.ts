import { isProfileComplete, parseCommaList } from "./api";

describe("profile api helpers", () => {
  it("parses comma separated lists", () => {
    expect(parseCommaList("peanuts, shellfish,  ")).toEqual(["peanuts", "shellfish"]);
  });

  it("detects completed onboarding profiles", () => {
    expect(
      isProfileComplete({
        age: 29,
        gender: "female",
        height_cm: "165.00",
        weight_kg: "62.00",
        goal: "general_health",
        activity_level: "moderate",
        diet_type: "none",
        allergies: [],
        dietary_restrictions: [],
        disliked_foods: [],
      }),
    ).toBe(true);

    expect(
      isProfileComplete({
        age: 29,
        gender: "female",
        height_cm: "165.00",
        weight_kg: "62.00",
        goal: "",
        activity_level: "",
        diet_type: "none",
        allergies: [],
        dietary_restrictions: [],
        disliked_foods: [],
      }),
    ).toBe(false);
  });
});
