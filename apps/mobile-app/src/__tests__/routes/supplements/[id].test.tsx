import { useMutation, useQuery } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";
import EditSupplementScreen from "../../../../app/supplements/[id]";

jest.mock("../../../features/supplements/api", () => ({
  deleteUserSupplement: jest.fn(async () => undefined),
  listUserSupplements: jest.fn(),
  updateUserSupplement: jest.fn(async () => ({})),
}));

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn(),
  useQueryClient: () => ({ invalidateQueries: jest.fn(async () => undefined) }),
}));

describe("EditSupplementScreen", () => {
  beforeEach(() => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "7" });
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
    (useMutation as jest.Mock).mockImplementation((options) => ({
      isPending: false,
      mutate: (payload?: unknown) => options.mutationFn(payload),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("updates a user supplement", async () => {
    const { updateUserSupplement } = require("../../../features/supplements/api");

    render(<EditSupplementScreen />);

    expect(screen.getByText("Vitamin D")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("dose"), "2000 IU");
    fireEvent.press(screen.getByLabelText("Update user supplement"));

    await waitFor(() => {
      expect(updateUserSupplement).toHaveBeenCalledWith(7, {
        active: true,
        dose: "2000 IU",
        frequency: "daily",
        time_of_day: "morning",
      });
    });
  });

  it("pauses a user supplement", async () => {
    const { updateUserSupplement } = require("../../../features/supplements/api");

    render(<EditSupplementScreen />);

    fireEvent(screen.getByLabelText("Use supplement in recommendations"), "valueChange", false);
    expect(screen.getByText("Paused")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Update user supplement"));

    await waitFor(() => {
      expect(updateUserSupplement).toHaveBeenCalledWith(7, {
        active: false,
        dose: "1000 IU",
        frequency: "daily",
        time_of_day: "morning",
      });
    });
  });

  it("deletes a user supplement", async () => {
    const { deleteUserSupplement } = require("../../../features/supplements/api");

    render(<EditSupplementScreen />);

    expect(screen.getByText("Vitamin D")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Delete user supplement"));

    await waitFor(() => {
      expect(deleteUserSupplement).toHaveBeenCalledWith(7);
    });
  });
});
