import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bot, MessageSquare, Search, Trash2, User, Utensils } from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  clearAdminUserChatSessions,
  fetchPaginatedAdminChatSessions,
  fetchPaginatedAdminChatUsers,
  type AdminChatMessage,
  type AdminChatSession,
  type AdminChatUser,
} from "../../api/chats";
import { AdminPagination } from "../../components/admin/AdminPagination";
import { ListSkeleton, MetricSkeletonGrid } from "../../components/admin/LoadingStates";
import { StatCard } from "../../components/admin/StatCard";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";

const USER_PAGE_SIZE = 12;
const SESSION_PAGE_SIZE = 8;

function formatDate(value?: string | null) {
  if (!value) {
    return "No chats yet";
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ChatsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const queryParams = useMemo(
    () => ({
      page,
      page_size: USER_PAGE_SIZE,
      search: search || undefined,
    }),
    [page, search],
  );

  const { data, isError, isLoading } = useQuery({
    queryKey: ["admin-chat-users", queryParams],
    queryFn: () => fetchPaginatedAdminChatUsers(queryParams),
  });

  const users = data?.results ?? [];
  const totalUsers = data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalUsers / USER_PAGE_SIZE));
  const visibleSessions = users.reduce((total, user) => total + user.chat_session_count, 0);
  const visibleMessages = users.reduce((total, user) => total + user.chat_message_count, 0);

  const updateSearch = (updates: Record<string, string | number | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === "" || value === null) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });
    setSearchParams(next);
  };

  return (
    <section className="chats-view" aria-labelledby="chats-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">AI Monitoring</p>
          <h1 id="chats-title">Chat Users</h1>
        </div>
        <span className={isError ? "status-pill status-pill-error" : "status-pill"}>
          {isLoading ? "Loading" : isError ? "API unavailable" : `${totalUsers} users`}
        </span>
      </div>

      {isLoading && !data ? (
        <MetricSkeletonGrid count={3} />
      ) : (
        <div className="metric-grid compact-metric-grid">
          <StatCard icon={User} label="Chat Users" value={totalUsers} />
          <StatCard icon={MessageSquare} label="Visible Sessions" value={visibleSessions} />
          <StatCard icon={Bot} label="Visible Messages" value={visibleMessages} />
        </div>
      )}

      <Card>
        <CardHeader className="food-list-header">
          <div>
            <CardTitle>Users With Chat History</CardTitle>
            <CardDescription>Open a user to inspect their prompts, AI responses, and cited recommendation foods.</CardDescription>
          </div>
          <div className="search-row">
            <Search aria-hidden="true" size={17} />
            <input
              aria-label="Search chat users"
              onChange={(event) => updateSearch({ search: event.target.value, page: 1 })}
              placeholder="Search users or chat text"
              type="search"
              value={search}
            />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {isLoading && users.length === 0 ? (
            <ListSkeleton rows={USER_PAGE_SIZE} />
          ) : users.length === 0 ? (
            <p className="empty-line">{isError ? "Unable to load chat users." : "No chat users found."}</p>
          ) : (
            <div className="card-list-grid">
              {users.map((user) => (
                <ChatUserCard key={user.id} onOpen={() => navigate(`/chats/${user.id}`)} user={user} />
              ))}
            </div>
          )}
          <div className="pagination-row">
            <div className="pagination-meta">Page {page} of {pageCount}</div>
            <AdminPagination disabled={isLoading} onPageChange={(nextPage) => updateSearch({ page: nextPage })} page={page} pageCount={pageCount} />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export function UserChatsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userId = "" } = useParams();
  const parsedUserId = Number(userId);
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const queryParams = useMemo(
    () => ({
      page,
      page_size: SESSION_PAGE_SIZE,
      search: search || undefined,
      user_id: parsedUserId,
    }),
    [page, parsedUserId, search],
  );

  const { data, isError, isLoading } = useQuery({
    enabled: Number.isFinite(parsedUserId),
    queryKey: ["admin-user-chats", queryParams],
    queryFn: () => fetchPaginatedAdminChatSessions(queryParams),
  });

  const clearMutation = useMutation({
    mutationFn: () => clearAdminUserChatSessions(parsedUserId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-user-chats"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-chat-users"] });
    },
  });

  const sessions = data?.results ?? [];
  const selectedUser = sessions[0]?.user;
  const totalSessions = data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalSessions / SESSION_PAGE_SIZE));
  const pageMessages = sessions.flatMap((session) => session.messages);
  const citedFoodCount = pageMessages.reduce((total, message) => total + (message.metadata?.cited_items?.length ?? 0), 0);
  const userMessageCount = pageMessages.filter((message) => message.role === "user").length;
  const assistantMessageCount = pageMessages.filter((message) => message.role === "assistant").length;

  const updateSearch = (updates: Record<string, string | number | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === "" || value === null) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });
    setSearchParams(next);
  };

  return (
    <section className="chats-view" aria-labelledby="user-chats-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">User Chat Detail</p>
          <h1 id="user-chats-title">{selectedUser ? selectedUser.name || selectedUser.email : "User Chats"}</h1>
        </div>
        <div className="row-actions">
          <Button onClick={() => navigate("/chats")} type="button" variant="outline">
            <ArrowLeft aria-hidden="true" size={17} />
            Back
          </Button>
          <Button disabled={clearMutation.isPending || !Number.isFinite(parsedUserId)} onClick={() => clearMutation.mutate()} type="button" variant="destructive">
            <Trash2 aria-hidden="true" size={17} />
            {clearMutation.isPending ? "Clearing" : "Clear chats"}
          </Button>
        </div>
      </div>

      {clearMutation.isError ? <p className="empty-line">Unable to clear this user's chats.</p> : null}

      {isLoading && !data ? (
        <MetricSkeletonGrid count={4} />
      ) : (
        <div className="metric-grid compact-metric-grid">
          <StatCard icon={MessageSquare} label="Sessions" value={totalSessions} />
          <StatCard icon={User} label="User Messages" value={userMessageCount} />
          <StatCard icon={Bot} label="AI Responses" value={assistantMessageCount} />
          <StatCard icon={Utensils} label="Cited Foods" value={citedFoodCount} />
        </div>
      )}

      <Card>
        <CardHeader className="food-list-header">
          <div>
            <CardTitle>{selectedUser?.email ?? "Chat Sessions"}</CardTitle>
            <CardDescription>Only this user's chats are shown here.</CardDescription>
          </div>
          <div className="search-row">
            <Search aria-hidden="true" size={17} />
            <input
              aria-label="Search this user's chats"
              onChange={(event) => updateSearch({ search: event.target.value, page: 1 })}
              placeholder="Search prompts, responses, or foods"
              type="search"
              value={search}
            />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {isLoading && sessions.length === 0 ? (
            <ListSkeleton rows={SESSION_PAGE_SIZE} />
          ) : sessions.length === 0 ? (
            <p className="empty-line">{isError ? "Unable to load chats." : "No chat sessions found for this user."}</p>
          ) : (
            <div className="card-list-grid">
              {sessions.map((session) => (
                <ChatSessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
          <div className="pagination-row">
            <div className="pagination-meta">Page {page} of {pageCount}</div>
            <AdminPagination disabled={isLoading} onPageChange={(nextPage) => updateSearch({ page: nextPage })} page={page} pageCount={pageCount} />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function ChatUserCard({ onOpen, user }: { onOpen: () => void; user: AdminChatUser }) {
  return (
    <article className="summary-card">
      <div className="section-status-row">
        <div>
          <h3>{user.name || user.email}</h3>
          <p>{user.email}</p>
        </div>
        <Badge variant="secondary">{user.chat_session_count} sessions</Badge>
      </div>
      <div className="section-status-row">
        <p>{user.chat_message_count} messages</p>
        <p>Latest: {formatDate(user.latest_chat_at)}</p>
      </div>
      <Button onClick={onOpen} type="button">
        See chats
      </Button>
    </article>
  );
}

function ChatSessionCard({ session }: { session: AdminChatSession }) {
  const assistantMessages = session.messages.filter((message) => message.role === "assistant");
  const citedItems = assistantMessages.flatMap((message) => message.metadata?.cited_items ?? []);

  return (
    <article className="summary-card">
      <div className="section-status-row">
        <div>
          <h3>{session.title}</h3>
          <p>Updated {formatDate(session.updated_at)}</p>
        </div>
        <Badge variant="secondary">{session.messages.length} messages</Badge>
      </div>

      <div className="grid gap-3">
        {session.messages.map((message) => (
          <ChatMessageBlock key={message.id} message={message} />
        ))}
      </div>

      <div className="grid gap-2">
        <div className="section-status-row">
          <strong>Recommended foods for this chat</strong>
          <span className="soft-badge soft-badge-green">{citedItems.length}</span>
        </div>
        {citedItems.length ? (
          citedItems.slice(0, 5).map((item) => (
            <div className="rule-metric" key={`${session.id}-${item.id}`}>
              <div>
                <span>{item.food.category}</span>
                <strong>{item.food.name}</strong>
              </div>
              <p>{item.explanation}</p>
            </div>
          ))
        ) : (
          <p>No foods were cited for this chat.</p>
        )}
      </div>
    </article>
  );
}

function ChatMessageBlock({ message }: { message: AdminChatMessage }) {
  const isAssistant = message.role === "assistant";
  return (
    <div className="rule-metric">
      <div>
        <span>{isAssistant ? "AI response" : "User prompt"}</span>
        <strong>{formatDate(message.created_at)}</strong>
      </div>
      <p>{message.content}</p>
      {isAssistant && message.recommendation_run_id ? <p>Recommendation run: {message.recommendation_run_id}</p> : null}
    </div>
  );
}
