import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationsPage } from "./NotificationsPage";

const notificationsApi = vi.hoisted(() => ({
  createNotificationCampaign: vi.fn(async (payload) => ({
    id: 2,
    status: "queued",
    recipient_count: payload.recipient_ids.length,
    sent_count: 0,
    failed_count: 0,
    skipped_count: 0,
    error_message: "",
    created_by_email: "admin@example.com",
    created_at: "2026-06-11T08:00:00Z",
    started_at: null,
    completed_at: null,
    ...payload,
  })),
  fetchNotificationAudienceCount: vi.fn(async (payload) => (payload.audience === "enabled_users" ? 12 : payload.recipient_ids.length)),
  fetchNotificationCampaigns: vi.fn(async () => [
    {
      id: 1,
      audience: "enabled_users",
      recipient_ids: [],
      title: "Welcome update",
      body: "The new notification center is available.",
      destination_url: "",
      status: "completed",
      recipient_count: 10,
      sent_count: 8,
      skipped_count: 2,
      failed_count: 0,
      error_message: "",
      created_by_email: "admin@example.com",
      created_at: "2026-06-10T08:00:00Z",
      started_at: "2026-06-10T08:00:01Z",
      completed_at: "2026-06-10T08:00:05Z",
    },
  ]),
}));

const usersApi = vi.hoisted(() => ({
  fetchAdminUsers: vi.fn(async () => [
    {
      id: 2,
      email: "user@example.com",
      name: "Demo User",
      is_staff: false,
      is_active: true,
      date_joined: "2026-05-08T13:00:00Z",
      profile: null,
      supplement_count: 0,
      recommendation_count: 0,
      feedback_count: 0,
    },
  ]),
}));

vi.mock("../../api/notifications", () => notificationsApi);
vi.mock("../../api/users", () => usersApi);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("NotificationsPage", () => {
  it("selects users, confirms, and queues a notification campaign", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <NotificationsPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Welcome update")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /specific users/i }));
    fireEvent.click(await screen.findByRole("checkbox"));
    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "Plan ready" } });
    fireEvent.change(screen.getByLabelText(/^message$/i), { target: { value: "Open the app to review your plan." } });

    await waitFor(() => expect(screen.getByRole("button", { name: /review and send/i })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /review and send/i }));
    fireEvent.click(await screen.findByRole("button", { name: /queue notification/i }));

    await waitFor(() => {
    expect(notificationsApi.createNotificationCampaign).toHaveBeenCalledWith({
      audience: "specific_users",
      recipient_ids: [2],
      title: "Plan ready",
      body: "Open the app to review your plan.",
      destination_url: "",
    }, expect.anything());
    });
    expect(await screen.findByText(/queued successfully/i)).toBeInTheDocument();
  });
});
