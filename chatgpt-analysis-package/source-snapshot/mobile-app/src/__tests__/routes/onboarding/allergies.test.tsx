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

    fireEvent.press(screen.getByLabelText("Peanuts"));
    fireEvent.press(screen.getByLabelText("Shellfish"));
    fireEvent.press(screen.getByLabelText("Halal"));
    fireEvent.press(screen.getByLabelText("Lactose free"));
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

    expect(await screen.findByText("Peanuts")).toBeTruthy();
    expect(screen.getByText("Shellfish")).toBeTruthy();
    expect(screen.getByText("Halal")).toBeTruthy();
  });
});
