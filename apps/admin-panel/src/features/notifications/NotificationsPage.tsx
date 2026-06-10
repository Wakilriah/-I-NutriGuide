import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCircle2, Search, Send, Users } from "lucide-react";
import { useMemo, useState } from "react";
import {
  createNotificationCampaign,
  fetchNotificationAudienceCount,
  fetchNotificationCampaigns,
  type NotificationAudience,
  type NotificationCampaignPayload,
} from "../../api/notifications";
import { fetchAdminUsers } from "../../api/users";
import { ConfirmDialog } from "../../components/admin/ConfirmDialog";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";

const emptyPayload: NotificationCampaignPayload = {
  audience: "enabled_users",
  recipient_ids: [],
  title: "",
  body: "",
  destination_url: "",
};

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const [payload, setPayload] = useState(emptyPayload);
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const campaignsQuery = useQuery({ queryKey: ["admin-notification-campaigns"], queryFn: fetchNotificationCampaigns });
  const usersQuery = useQuery({ queryKey: ["admin-notification-users"], queryFn: () => fetchAdminUsers() });
  const countQuery = useQuery({
    queryKey: ["admin-notification-audience-count", payload.audience, payload.recipient_ids],
    queryFn: () => fetchNotificationAudienceCount({ ...payload, title: payload.title || "Preview", body: payload.body || "Preview" }),
  });
  const sendMutation = useMutation({
    mutationFn: createNotificationCampaign,
    onSuccess: async () => {
      setConfirmOpen(false);
      setPayload(emptyPayload);
      setNotice("Notification campaign queued successfully.");
      await queryClient.invalidateQueries({ queryKey: ["admin-notification-campaigns"] });
    },
  });

  const users = usersQuery.data ?? [];
  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(term)) : users;
  }, [search, users]);
  const selectedUsers = users.filter((user) => payload.recipient_ids.includes(user.id));
  const recipientCount = countQuery.data ?? (payload.audience === "specific_users" ? payload.recipient_ids.length : 0);
  const canSend = payload.title.trim().length > 0 && payload.body.trim().length > 0 && recipientCount > 0;

  const setAudience = (audience: NotificationAudience) => {
    setPayload((current) => ({ ...current, audience, recipient_ids: audience === "enabled_users" ? [] : current.recipient_ids }));
  };

  const toggleUser = (userId: number) => {
    setPayload((current) => ({
      ...current,
      recipient_ids: current.recipient_ids.includes(userId)
        ? current.recipient_ids.filter((id) => id !== userId)
        : [...current.recipient_ids, userId],
    }));
  };

  return (
    <section className="notifications-view" aria-labelledby="notifications-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">User engagement</p>
          <h1 id="notifications-title">Notifications</h1>
          <p>Send an in-app, mobile push, and browser notification to selected users.</p>
        </div>
        <Badge variant="secondary">
          <Bell size={14} /> {recipientCount} recipients
        </Badge>
      </div>

      {notice ? <p className="success-banner">{notice}</p> : null}
      {sendMutation.isError ? <p className="error-banner">Unable to queue this notification campaign.</p> : null}

      <div className="notifications-layout">
        <section className="panel notification-composer">
          <div className="panel-heading">
            <div>
              <h2>Compose notification</h2>
              <p>The notification is saved in each user&apos;s inbox even when no push token is available.</p>
            </div>
            <Send aria-hidden="true" size={20} />
          </div>

          <div className="notification-audience-options" role="radiogroup" aria-label="Notification audience">
            <button
              className={payload.audience === "enabled_users" ? "audience-option audience-option-active" : "audience-option"}
              onClick={() => setAudience("enabled_users")}
              role="radio"
              aria-checked={payload.audience === "enabled_users"}
              type="button"
            >
              <Bell size={18} />
              <span><strong>Notification-enabled users</strong><small>Send to every active user who enabled notifications.</small></span>
            </button>
            <button
              className={payload.audience === "specific_users" ? "audience-option audience-option-active" : "audience-option"}
              onClick={() => setAudience("specific_users")}
              role="radio"
              aria-checked={payload.audience === "specific_users"}
              type="button"
            >
              <Users size={18} />
              <span><strong>Specific users</strong><small>Select exactly who should receive this message.</small></span>
            </button>
          </div>

          {payload.audience === "specific_users" ? (
            <div className="notification-user-picker">
              <Label htmlFor="notification-user-search">Select users</Label>
              <div className="search-row">
                <Search aria-hidden="true" size={17} />
                <Input
                  aria-label="Search notification users"
                  id="notification-user-search"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name or email"
                  value={search}
                />
              </div>
              <div className="notification-user-list">
                {visibleUsers.map((user) => (
                  <label className="notification-user-option" key={user.id}>
                    <input checked={payload.recipient_ids.includes(user.id)} onChange={() => toggleUser(user.id)} type="checkbox" />
                    <span><strong>{user.name || user.email}</strong><small>{user.email}</small></span>
                  </label>
                ))}
              </div>
              <p className="field-help">{selectedUsers.length} users selected.</p>
            </div>
          ) : null}

          <div className="form-field">
            <Label htmlFor="notification-title">Title</Label>
            <Input
              id="notification-title"
              maxLength={120}
              onChange={(event) => setPayload((current) => ({ ...current, title: event.target.value }))}
              placeholder="Your new nutrition plan is ready"
              value={payload.title}
            />
            <p className="field-help">{payload.title.length}/120 characters</p>
          </div>
          <div className="form-field">
            <Label htmlFor="notification-body">Message</Label>
            <Textarea
              id="notification-body"
              maxLength={255}
              onChange={(event) => setPayload((current) => ({ ...current, body: event.target.value }))}
              placeholder="Open I-NutriGuide to review your latest update."
              value={payload.body}
            />
            <p className="field-help">{payload.body.length}/255 characters</p>
          </div>
          <div className="form-field">
            <Label htmlFor="notification-url">Destination link (optional)</Label>
            <Input
              id="notification-url"
              onChange={(event) => setPayload((current) => ({ ...current, destination_url: event.target.value }))}
              placeholder="inutriguide://tabs/notifications"
              value={payload.destination_url}
            />
          </div>
          <Button disabled={!canSend || sendMutation.isPending} onClick={() => setConfirmOpen(true)} type="button">
            <Send size={16} /> Review and send
          </Button>
        </section>

        <section className="panel notification-history">
          <div className="panel-heading">
            <div><h2>Campaign history</h2><p>Recent delivery results from the background worker.</p></div>
            <CheckCircle2 aria-hidden="true" size={20} />
          </div>
          {campaignsQuery.isLoading ? <p className="empty-line">Loading campaigns...</p> : null}
          {(campaignsQuery.data ?? []).map((campaign) => (
            <article className="notification-campaign-card" key={campaign.id}>
              <div className="notification-campaign-heading">
                <div><strong>{campaign.title}</strong><small>{new Date(campaign.created_at).toLocaleString()}</small></div>
                <Badge variant={campaign.status === "failed" ? "destructive" : "secondary"}>{campaign.status}</Badge>
              </div>
              <p>{campaign.body}</p>
              <div className="campaign-metrics">
                <span>{campaign.recipient_count} recipients</span>
                <span>{campaign.sent_count} sent</span>
                <span>{campaign.skipped_count} inbox only</span>
                <span>{campaign.failed_count} failed</span>
              </div>
            </article>
          ))}
          {!campaignsQuery.isLoading && (campaignsQuery.data ?? []).length === 0 ? <p className="empty-line">No campaigns sent yet.</p> : null}
        </section>
      </div>

      <ConfirmDialog
        confirmLabel="Queue notification"
        description={`Send "${payload.title}" to ${recipientCount} users? This action creates an unread in-app notification immediately.`}
        isLoading={sendMutation.isPending}
        onConfirm={() => sendMutation.mutate(payload)}
        onOpenChange={setConfirmOpen}
        open={confirmOpen}
        title="Send notification campaign?"
      />
    </section>
  );
}
