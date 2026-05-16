import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import AllergyOnboardingScreen from "../../../../app/onboarding/allergies";

jest.mock("../../../features/profile/api", () => ({
  getProfile: jest.fn(async () => ({
    allergies: [],
    dietary_restrictions: [],
  })),
  parseCommaList: jest.requireActual("../../../features/profile/api").parseCommaList,
  updateProfile: jest.fn(async () => ({})),
}));

describe("AllergyOnboardingScreen", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("saves allergy and restriction lists", async () => {
    const { updateProfile } = require("../../../features/profile/api");
    render(<AllergyOnboardingScreen />);

    fireEvent.changeText(screen.getByLabelText("Allergies"), "peanuts, shellfish");
    fireEvent.changeText(screen.getByLabelText("Dietary restrictions"), "halal, lactose_free");
    fireEvent.press(screen.getByLabelText("Save allergy details"));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        allergies: ["peanuts", "shellfish"],
        dietary_restrictions: ["halal", "lactose_free"],
      });
    });
  });

  it("prefills existing allergy and restriction lists", async () => {
    const { getProfile } = require("../../../features/profile/api");
    getProfile.mockResolvedValueOnce({
      allergies: ["peanuts", "shellfish"],
      dietary_restrictions: ["halal"],
    });

    render(<AllergyOnboardingScreen />);

    expect(await screen.findByDisplayValue("peanuts, shellfish")).toBeTruthy();
    expect(screen.getByDisplayValue("halal")).toBeTruthy();
  });
});
