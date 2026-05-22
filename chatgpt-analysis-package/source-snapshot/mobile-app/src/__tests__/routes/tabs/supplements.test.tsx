import { useQuery } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";
import SupplementsScreen from "../../../../app/tabs/supplements";

jest.mock("../../../features/supplements/api", () => ({
  listUserSupplements: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
}));

describe("SupplementsScreen", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows an empty state", () => {
    (useQuery as jest.Mock).mockReturnValue({ data: [], isError: false, isLoading: false });

    render(<SupplementsScreen />);

    expect(screen.getByText("No supplements added yet.")).toBeTruthy();
  });

  it("shows user supplements", () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: [
        {
          id: 7,
          supplement: { id: 1, name: "Vitamin D", slug: "vitamin-d", description: "", common_dose: "", is_active: true },
          dose: "1000 IU",
          frequency: "daily",
          time_of_day: "morning",
          active: true,
        },
      ],
      isError: false,
      isLoading: false,
    });

    render(<SupplementsScreen />);

    expect(screen.getByText("Vitamin D")).toBeTruthy();
    expect(screen.getByText("1000 IU - daily - morning")).toBeTruthy();
  });
});
