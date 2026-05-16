import { useMutation, useQuery } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import AddSupplementScreen from "../../../../app/supplements/new";

jest.mock("../../../features/supplements/api", () => ({
  createUserSupplement: jest.fn(async () => ({})),
  listSupplements: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn(),
  useQueryClient: () => ({ invalidateQueries: jest.fn(async () => undefined) }),
}));

describe("AddSupplementScreen", () => {
  beforeEach(() => {
    (useMutation as jest.Mock).mockImplementation((options) => ({
      isError: false,
      isPending: false,
      mutate: (payload: unknown) => options.mutationFn(payload),
    }));
    (useQuery as jest.Mock).mockReturnValue({
      data: [{ id: 1, name: "Vitamin D", slug: "vitamin-d", description: "", common_dose: "1000 IU", is_active: true }],
      isError: false,
      isLoading: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("creates a user supplement", async () => {
    const { createUserSupplement } = require("../../../features/supplements/api");

    render(<AddSupplementScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Choose Vitamin D"));
    });
    fireEvent.changeText(screen.getByLabelText("frequency"), "daily");
    fireEvent.changeText(screen.getByLabelText("time_of_day"), "morning");
    fireEvent.press(screen.getByLabelText("Create user supplement"));

    await waitFor(() => {
      expect(createUserSupplement).toHaveBeenCalledWith({
        supplement_id: 1,
        dose: "1000 IU",
        frequency: "daily",
        time_of_day: "morning",
        active: true,
      });
    });
  });

  it("keeps a manually entered dose when choosing a supplement", async () => {
    render(<AddSupplementScreen />);

    fireEvent.changeText(screen.getByLabelText("dose"), "2000 IU");
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Choose Vitamin D"));
    });

    expect(screen.getByDisplayValue("2000 IU")).toBeTruthy();
  });

  it("shows a save error message", () => {
    (useMutation as jest.Mock).mockReturnValue({
      isError: true,
      isPending: false,
      mutate: jest.fn(),
    });

    render(<AddSupplementScreen />);

    expect(screen.getByText("Unable to save supplement. Please try again.")).toBeTruthy();
  });
});
