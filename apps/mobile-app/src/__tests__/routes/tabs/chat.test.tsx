import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react-native";
import ChatScreen from "../../../../app/tabs/chat";
import { clearChatSessions, listChatSessions, sendChatMessage } from "../../../features/chat/api";
import { renderWithClient } from "../../../test/render";

jest.mock("../../../features/chat/api", () => ({
  clearChatSessions: jest.fn(),
  listChatSessions: jest.fn(),
  sendChatMessage: jest.fn(),
}));

const orangeCitation = {
  id: 7,
  rank: 1,
  food: { id: 3, name: "Orange", slug: "orange", category: "Fruits" },
  score: 0.91,
  matched_nutrients: ["vitamine_c"],
  matched_rules: [{ antecedent: "supplement:iron" }],
  warnings: [],
  explanation: "Orange provides vitamin C and matches your iron supplement.",
};

const assistantMessage = {
  id: 2,
  role: "assistant",
  content: "Try orange with your iron supplement.",
  metadata: { cited_items: [orangeCitation], intent: "recommendation" },
  recommendation_run_id: "run-1",
  groq_model: "test-model",
  token_usage: {},
  error_code: "",
  created_at: "2026-05-16T00:00:00Z",
};

const userMessage = {
  id: 1,
  role: "user",
  content: "What should I eat with iron?",
  metadata: {},
  recommendation_run_id: null,
  groq_model: "",
  token_usage: {},
  error_code: "",
  created_at: "2026-05-16T00:00:00Z",
};

const mockListChatSessions = listChatSessions as jest.Mock;
const mockSendChatMessage = sendChatMessage as jest.Mock;
const mockClearChatSessions = clearChatSessions as jest.Mock;

describe("ChatScreen", () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  beforeEach(() => {
    mockClearChatSessions.mockResolvedValue(undefined);
  });

  it("shows persisted chat history with cited recommendation cards", async () => {
    mockListChatSessions.mockResolvedValue([{ id: "session-1", title: "Iron", messages: [userMessage, assistantMessage] }]);

    renderWithClient(<ChatScreen />);

    await waitFor(() => {
      expect(screen.getByText("Try orange with your iron supplement.")).toBeTruthy();
      expect(screen.getByText("Orange")).toBeTruthy();
      expect(screen.getByText("Orange provides vitamin C and matches your iron supplement.")).toBeTruthy();
    });
  });

  it("sends a message to the chat API and renders the assistant answer", async () => {
    mockListChatSessions.mockResolvedValue([]);
    mockSendChatMessage.mockResolvedValue({
      session_id: "session-1",
      user_message: userMessage,
      assistant_message: assistantMessage,
      recommendation_run: null,
      cited_items: [orangeCitation],
    });

    renderWithClient(<ChatScreen />);
    fireEvent.changeText(screen.getByLabelText("Chat message"), "What should I eat with iron?");
    fireEvent.press(screen.getByLabelText("Send chat message"));

    await waitFor(() => {
      expect(mockSendChatMessage.mock.calls[0][0]).toEqual({ message: "What should I eat with iron?", session_id: undefined });
      expect(screen.getByText("Try orange with your iron supplement.")).toBeTruthy();
      expect(screen.getByText("Orange")).toBeTruthy();
    });
  });

  it("shows a skeleton while waiting for the assistant", async () => {
    let resolveSend: (value: unknown) => void = () => undefined;
    mockListChatSessions.mockResolvedValue([]);
    mockSendChatMessage.mockReturnValue(
      new Promise((resolve) => {
        resolveSend = resolve;
      }),
    );

    renderWithClient(<ChatScreen />);
    fireEvent.press(screen.getByText("Recommend foods for my supplements"));

    await waitFor(() => {
      expect(screen.getByTestId("chat-loading-skeleton")).toBeTruthy();
    });

    await act(async () => {
      resolveSend({
        session_id: "session-1",
        user_message: userMessage,
        assistant_message: assistantMessage,
        recommendation_run: null,
        cited_items: [orangeCitation],
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Try orange with your iron supplement.")).toBeTruthy();
    });
  });

  it("clears persisted chat history", async () => {
    mockListChatSessions.mockResolvedValue([{ id: "session-1", title: "Iron", messages: [userMessage, assistantMessage] }]);

    renderWithClient(<ChatScreen />);

    await waitFor(() => {
      expect(screen.getByText("Try orange with your iron supplement.")).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText("Clear chat history"));

    await waitFor(() => {
      expect(mockClearChatSessions).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("Try orange with your iron supplement.")).toBeNull();
      expect(screen.getByText("Hi, I am your nutrition assistant. Ask about food pairings, supplement timing, allergies, or recommendation ideas.")).toBeTruthy();
    });
  });
});
