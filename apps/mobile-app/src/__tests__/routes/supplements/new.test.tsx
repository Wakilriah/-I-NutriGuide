import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import AddSupplementScreen from "../../../../app/supplements/new";

jest.mock("../../../features/supplements/api", () => ({
  createUserSupplement: jest.fn(async () => ({})),
  listSupplementsPage: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  useInfiniteQuery: jest.fn(),
  useMutation: jest.fn(),
  useQuery: jest.fn(),
  useQueryClient: () => ({ invalidateQueries: jest.fn(async () => undefined) }),
}));

describe("AddSupplementScreen", () => {
  beforeEach(() => {
    (useMutation as jest.Mock).mockImplementation((options) => ({
      isError: false,
      isPending: false,
      mutate: async (payload: unknown) => {
        await options.mutationFn(payload);
        await options.onSuccess?.();
      },
    }));
    (useInfiniteQuery as jest.Mock).mockReturnValue({
      data: { pages: [{ count: 1, next: null, previous: null, results: [{ id: 1, name: "Vitamin D", slug: "vitamin-d", description: "", common_dose: "1000 IU", is_active: true }] }] },
      isError: false,
      isFetchingNextPage: false,
      isLoading: false,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
    });
    (useQuery as jest.Mock).mockReturnValue({
      data: undefined,
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
    fireEvent.press(screen.getByLabelText("Save selected supplements"));

    await waitFor(() => {
      expect(createUserSupplement).toHaveBeenCalledWith({
        supplement_id: 1,
        dose: "1000 IU",
        frequency: "daily",
        time_of_day: "08:00",
        active: true,
      });
    });
  });

  it("keeps a manually entered dose when choosing a supplement", async () => {
    render(<AddSupplementScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Choose Vitamin D"));
    });
    fireEvent.changeText(screen.getByLabelText("Vitamin D dose amount"), "2000");

    expect(screen.getByDisplayValue("2000")).toBeTruthy();
  });

  it("shows a save error message", async () => {
    (useMutation as jest.Mock).mockImplementation((options) => ({
      isError: true,
      isPending: false,
      mutate: async () => {
        await options.onError?.();
      },
    }));

    render(<AddSupplementScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Choose Vitamin D"));
    });
    fireEvent.press(await screen.findByLabelText("Save selected supplements"));

    expect(screen.getByText("Unable to save supplements. Check dose and timing fields.")).toBeTruthy();
  });
});
