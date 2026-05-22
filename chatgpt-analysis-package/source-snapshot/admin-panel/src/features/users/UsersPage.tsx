import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowLeft, Edit3, Mail, Plus, Search, ShieldCheck, Trash2, UserCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { z } from "zod";
import type { PaginatedResponse } from "../../api/types";
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUser,
  fetchPaginatedAdminUsers,
  type AdminUser,
  type AdminUserPayload,
  updateAdminUser,
} from "../../api/users";
import { AdminPagination } from "../../components/admin/AdminPagination";
import { MetricSkeletonGrid, TableSkeleton } from "../../components/admin/LoadingStates";
import { StatCard } from "../../components/admin/StatCard";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { invalidateDashboard } from "../../lib/query-keys";
import { useAuthStore } from "../../store/auth-store";

const PAGE_SIZE = 10;

const userSchema = z.object({
  email: z.string().email("Enter a valid email."),
  name: z.string().min(2, "Name must be at least 2 characters."),
  password: z.string().optional(),
  is_staff: z.boolean(),
  is_active: z.boolean(),
  goal: z.string().optional(),
  diet_type: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

const defaultValues: UserFormValues = {
  email: "",
  name: "",
  password: "",
  is_staff: false,
  is_active: true,
  goal: "",
  diet_type: "none",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function updateUserPage(data: PaginatedResponse<AdminUser> | undefined, updatedUser: AdminUser) {
  if (!data) {
    return data;
  }

  return {
    ...data,
    results: data.results.map((user) => (user.id === updatedUser.id ? { ...user, ...updatedUser } : user)),
  };
}

function removeUserFromPage(data: PaginatedResponse<AdminUser> | undefined, userId: number) {
  if (!data) {
    return data;
  }

  const nextResults = data.results.filter((user) => user.id !== userId);
  return {
    ...data,
    count: Math.max(0, data.count - (nextResults.length === data.results.length ? 0 : 1)),
    results: nextResults,
  };
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const setCurrentUser = useAuthStore((state) => state.setUser);
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const page = Number(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const statusFilter = searchParams.get("active") || "";
  const roleFilter = searchParams.get("role") || "";

  const queryParams = useMemo(
    () => ({
      page,
      page_size: PAGE_SIZE,
      search: search || undefined,
      is_active: statusFilter ? (statusFilter as "true" | "false") : undefined,
      role: roleFilter ? (roleFilter as "admin" | "user") : undefined,
    }),
    [page, roleFilter, search, statusFilter],
  );

  const { data, isError, isFetching, isLoading } = useQuery({
    queryKey: ["admin-users", queryParams],
    queryFn: () => fetchPaginatedAdminUsers(queryParams),
  });

  const users = data?.results ?? [];
  const totalUsers = data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
  const activeUsers = users.filter((user) => user.is_active).length;
  const adminUsers = users.filter((user) => user.is_staff).length;
  const recommendationRuns = users.reduce((total, user) => total + user.recommendation_count, 0);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(
      editingUser
        ? {
            email: editingUser.email,
            name: editingUser.name,
            password: "",
            is_staff: editingUser.is_staff,
            is_active: editingUser.is_active,
            goal: editingUser.profile?.goal ?? "",
            diet_type: editingUser.profile?.diet_type ?? "none",
          }
        : defaultValues,
    );
  }, [editingUser, form]);

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

  const syncCurrentUser = (user: AdminUser) => {
    if (currentUser?.id === user.id) {
      setCurrentUser({ id: user.id, email: user.email, name: user.name, is_staff: user.is_staff });
    }
  };

  const refreshUsers = async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["admin-users"] }), invalidateDashboard(queryClient)]);
  };

  const saveMutation = useMutation({
    mutationKey: ["admin-users", "save"],
    mutationFn: (values: AdminUserPayload) => (editingUser ? updateAdminUser(editingUser.id, values) : createAdminUser(values)),
    onError: () => setFormError("Unable to save this user."),
    onSuccess: async (savedUser) => {
      queryClient.setQueriesData<PaginatedResponse<AdminUser>>({ queryKey: ["admin-users"] }, (oldData) => updateUserPage(oldData, savedUser));
      syncCurrentUser(savedUser);
      setFormError(null);
      setEditingUser(null);
      setIsDialogOpen(false);
      await refreshUsers();
    },
  });

  const updateMutation = useMutation({
    mutationKey: ["admin-users", "update"],
    mutationFn: ({ id, payload }: { id: number; payload: Partial<AdminUserPayload> }) => updateAdminUser(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-users"] });
      const previousPages = queryClient.getQueriesData<PaginatedResponse<AdminUser>>({ queryKey: ["admin-users"] });

      queryClient.setQueriesData<PaginatedResponse<AdminUser>>({ queryKey: ["admin-users"] }, (oldData) => {
        if (!oldData) {
          return oldData;
        }

        return {
          ...oldData,
          results: oldData.results.map((user) => (user.id === id ? { ...user, ...payload, profile: user.profile } : user)),
        };
      });

      return { previousPages };
    },
    onError: (_error, _variables, context) => {
      context?.previousPages.forEach(([queryKey, oldData]) => queryClient.setQueryData(queryKey, oldData));
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueriesData<PaginatedResponse<AdminUser>>({ queryKey: ["admin-users"] }, (oldData) => updateUserPage(oldData, updatedUser));
      syncCurrentUser(updatedUser);
    },
    onSettled: refreshUsers,
  });

  const deleteMutation = useMutation({
    mutationKey: ["admin-users", "delete"],
    mutationFn: deleteAdminUser,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["admin-users"] });
      const previousPages = queryClient.getQueriesData<PaginatedResponse<AdminUser>>({ queryKey: ["admin-users"] });
      queryClient.setQueriesData<PaginatedResponse<AdminUser>>({ queryKey: ["admin-users"] }, (oldData) => removeUserFromPage(oldData, id));
      return { previousPages };
    },
    onError: (_error, _id, context) => {
      context?.previousPages.forEach(([queryKey, oldData]) => queryClient.setQueryData(queryKey, oldData));
    },
    onSettled: refreshUsers,
  });

  const openCreateDialog = () => {
    setFormError(null);
    setEditingUser(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: AdminUser) => {
    setFormError(null);
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const handleSubmit = form.handleSubmit((values) => {
    const isEditingSelf = Boolean(editingUser && currentUser?.id === editingUser.id);
    saveMutation.mutate({
      email: values.email.trim(),
      name: values.name.trim(),
      password: values.password?.trim() || undefined,
      is_staff: isEditingSelf && editingUser ? editingUser.is_staff : values.is_staff,
      is_active: isEditingSelf && editingUser ? editingUser.is_active : values.is_active,
      profile: {
        goal: values.goal?.trim() ?? "",
        diet_type: values.diet_type || "none",
      },
    });
  });

  return (
    <section className="users-view" aria-labelledby="users-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Accounts</p>
          <h1 id="users-title">Users</h1>
        </div>
        <Button onClick={openCreateDialog} type="button">
          <Plus aria-hidden="true" size={17} />
          Create User
        </Button>
      </div>

      {isLoading && !data ? (
        <MetricSkeletonGrid count={4} />
      ) : (
        <div className="metric-grid compact-metric-grid">
          <StatCard icon={Users} label="Users" value={totalUsers} />
          <StatCard icon={UserCheck} label="Active On Page" value={activeUsers} />
          <StatCard icon={ShieldCheck} label="Admins On Page" value={adminUsers} />
          <StatCard icon={Activity} label="Recommendation Runs" value={recommendationRuns} />
        </div>
      )}

      <section className="panel users-panel">
        <div className="users-toolbar">
          <div>
            <h2>User Directory</h2>
            <p>{isFetching && data ? "Syncing latest account changes..." : "Manage account state, roles, profile context, and access."}</p>
          </div>
          <div className="users-filters">
            <div className="search-row users-search">
              <Search aria-hidden="true" size={17} />
              <input
                aria-label="Search users"
                onChange={(event) => updateSearch({ search: event.target.value, page: 1 })}
                placeholder="Search name or email"
                type="search"
                value={search}
              />
            </div>
            <select aria-label="Filter users by status" onChange={(event) => updateSearch({ active: event.target.value, page: 1 })} value={statusFilter}>
              <option value="">All status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <select aria-label="Filter users by role" onChange={(event) => updateSearch({ role: event.target.value, page: 1 })} value={roleFilter}>
              <option value="">All roles</option>
              <option value="admin">Admins</option>
              <option value="user">Users</option>
            </select>
          </div>
        </div>

        {isLoading && users.length === 0 ? (
          <TableSkeleton columns={5} rows={PAGE_SIZE} />
        ) : users.length === 0 ? (
          <p className="empty-line">{isError ? "Unable to load users." : "No users found."}</p>
        ) : (
          <div className="users-grid">
            {users.map((user) => {
              const isCurrentUser = currentUser?.id === user.id;
              const isUpdatingUser = updateMutation.isPending && updateMutation.variables?.id === user.id;
              const isDeletingUser = deleteMutation.isPending && deleteMutation.variables === user.id;

              return (
                <Card className="user-card" key={user.id}>
                  <CardHeader className="user-card-header">
                    <div className="user-identity">
                      <span className="user-avatar" aria-hidden="true">
                        {(user.name || user.email).slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <h3>{user.name || "Unnamed User"}</h3>
                        <p>
                          <Mail aria-hidden="true" size={14} />
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="user-badge-stack">
                      <Badge variant={user.is_active ? "secondary" : "destructive"}>{user.is_active ? "Active" : "Inactive"}</Badge>
                      <Badge variant={user.is_staff ? "default" : "outline"}>{user.is_staff ? "Admin" : "User"}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="user-card-content">
                    <div className="user-profile-strip">
                      <span>{user.profile?.goal || "No goal"}</span>
                      <span>{user.profile?.diet_type ?? "No profile"}</span>
                      <span>Joined {formatDate(user.date_joined)}</span>
                    </div>
                    <div className="user-stat-grid">
                      <span>
                        <strong>{user.supplement_count}</strong>
                        Supplements
                      </span>
                      <span>
                        <strong>{user.recommendation_count}</strong>
                        Runs
                      </span>
                      <span>
                        <strong>{user.feedback_count}</strong>
                        Feedback
                      </span>
                    </div>
                    {isCurrentUser ? <p className="user-safety-note">Your own admin access is protected from destructive changes.</p> : null}
                    <div className="user-actions">
                      <Button onClick={() => navigate(`/users/${user.id}`)} type="button" variant="secondary">
                        View
                      </Button>
                      <Button
                        disabled={isUpdatingUser || isCurrentUser}
                        onClick={() => updateMutation.mutate({ id: user.id, payload: { is_active: !user.is_active } })}
                        title={isCurrentUser ? "You cannot deactivate your own admin account." : undefined}
                        type="button"
                        variant="outline"
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        disabled={isUpdatingUser || isCurrentUser}
                        onClick={() => updateMutation.mutate({ id: user.id, payload: { is_staff: !user.is_staff } })}
                        title={isCurrentUser ? "You cannot remove your own admin access." : undefined}
                        type="button"
                        variant="outline"
                      >
                        {user.is_staff ? "Remove Admin" : "Make Admin"}
                      </Button>
                      <Button aria-label={`Edit ${user.email}`} onClick={() => openEditDialog(user)} size="icon" type="button" variant="outline">
                        <Edit3 aria-hidden="true" size={16} />
                      </Button>
                      <Button
                        aria-label={`Delete ${user.email}`}
                        disabled={isDeletingUser || isCurrentUser}
                        onClick={() => deleteMutation.mutate(user.id)}
                        size="icon"
                        title={isCurrentUser ? "You cannot delete your own account." : undefined}
                        type="button"
                        variant="destructive"
                      >
                        <Trash2 aria-hidden="true" size={16} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="pagination-row">
          <div className="pagination-meta">
            Page {page} of {pageCount}
            {isFetching && data ? <span>Syncing</span> : null}
          </div>
          <AdminPagination disabled={isLoading} onPageChange={(nextPage) => updateSearch({ page: nextPage })} page={page} pageCount={pageCount} />
        </div>
      </section>

      <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div>
              <DialogTitle>{editingUser ? "Edit User" : "Create User"}</DialogTitle>
              <DialogDescription>
                {editingUser ? "Update account access, profile context, and role." : "Create a user and choose whether they are an admin or standard user."}
              </DialogDescription>
            </div>
            <DialogClose onClose={() => setIsDialogOpen(false)} />
          </DialogHeader>
          <form className="resource-form p-5" onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <Label>
                <span>Email</span>
                <Input type="email" {...form.register("email")} />
                {form.formState.errors.email ? <small>{form.formState.errors.email.message}</small> : null}
              </Label>
              <Label>
                <span>Name</span>
                <Input type="text" {...form.register("name")} />
                {form.formState.errors.name ? <small>{form.formState.errors.name.message}</small> : null}
              </Label>
            </div>
            <Label>
              <span>Password {editingUser ? "(leave blank to keep current)" : ""}</span>
              <Input minLength={8} type="password" {...form.register("password")} />
            </Label>
            <div className="form-grid-2">
              <Label>
                <span>Goal</span>
                <Input placeholder="general_health" type="text" {...form.register("goal")} />
              </Label>
              <Label>
                <span>Diet Type</span>
                <select {...form.register("diet_type")}>
                  <option value="none">None</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="halal">Halal</option>
                  <option value="pescatarian">Pescatarian</option>
                  <option value="gluten_free">Gluten free</option>
                  <option value="lactose_free">Lactose free</option>
                </select>
              </Label>
            </div>
            <div className="form-grid-2">
              <Label className="checkbox-row">
                <input disabled={Boolean(editingUser && currentUser?.id === editingUser.id)} type="checkbox" {...form.register("is_active")} />
                <span>Active</span>
              </Label>
              <Label className="checkbox-row">
                <input disabled={Boolean(editingUser && currentUser?.id === editingUser.id)} type="checkbox" {...form.register("is_staff")} />
                <span>Admin role</span>
              </Label>
            </div>
            {formError ? <p className="form-error">{formError}</p> : null}
            <div className="form-actions">
              <Button disabled={saveMutation.isPending} type="submit">
                <Plus aria-hidden="true" size={18} />
                {saveMutation.isPending ? "Saving" : editingUser ? "Save User" : "Create User"}
              </Button>
              <Button onClick={() => setIsDialogOpen(false)} type="button" variant="outline">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function UserDetailPage() {
  const navigate = useNavigate();
  const { userId = "" } = useParams();
  const numericUserId = Number(userId);
  const { data: user, isError, isLoading } = useQuery({
    queryKey: ["admin-user", numericUserId],
    queryFn: () => fetchAdminUser(numericUserId),
    enabled: Number.isFinite(numericUserId) && numericUserId > 0,
  });

  return (
    <section className="users-view" aria-labelledby="user-detail-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Account Detail</p>
          <h1 id="user-detail-title">{user ? user.name || user.email : "User"}</h1>
        </div>
        <Button onClick={() => navigate("/users")} type="button" variant="outline">
          <ArrowLeft aria-hidden="true" size={17} />
          Back to Users
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton columns={4} rows={6} />
      ) : isError || !user ? (
        <p className="empty-line">Unable to load this user.</p>
      ) : (
        <>
          <div className="metric-grid compact-metric-grid">
            <StatCard icon={UserCheck} label="Status" value={user.is_active ? "Active" : "Inactive"} />
            <StatCard icon={ShieldCheck} label="Role" value={user.is_staff ? "Admin" : "User"} />
            <StatCard icon={Activity} label="Recommendation Runs" value={user.recommendation_count} />
            <StatCard icon={Users} label="Feedback" value={user.feedback_count} />
          </div>

          <div className="admin-detail-grid">
            <Card>
              <CardHeader>
                <h2>Profile Context</h2>
                <p>{user.email}</p>
              </CardHeader>
              <CardContent className="admin-detail-stack">
                <DetailRow label="Goal" value={user.profile?.goal || "Not set"} />
                <DetailRow label="Goals" value={(user.profile?.goals ?? []).join(", ") || "None"} />
                <DetailRow label="Health Conditions" value={(user.profile?.health_conditions ?? []).join(", ") || "None"} />
                <DetailRow label="Country" value={user.profile?.country || "Not set"} />
                <DetailRow label="Diet" value={user.profile?.diet_type || "Not set"} />
                <DetailRow label="Activity" value={user.profile?.activity_level || "Not set"} />
                <DetailRow label="Sports Days" value={user.profile?.sports_days_per_week?.toString() || "Not set"} />
                <DetailRow label="BMI" value={user.profile?.bmi || "Not set"} />
                <DetailRow label="Allergies" value={(user.profile?.allergies ?? []).join(", ") || "None"} />
                <DetailRow label="Restrictions" value={(user.profile?.dietary_restrictions ?? []).join(", ") || "None"} />
                <DetailRow label="Disliked Foods" value={(user.profile?.disliked_foods ?? []).join(", ") || "None"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2>User Supplements</h2>
                <p>{user.supplement_count} saved supplement entries</p>
              </CardHeader>
              <CardContent className="admin-detail-stack">
                {user.supplements.length === 0 ? (
                  <p className="empty-line">No supplements added.</p>
                ) : (
                  user.supplements.map((supplement) => (
                    <article className="detail-mini-card" key={supplement.id}>
                      <div className="section-status-row">
                        <strong>{supplement.name}</strong>
                        <Badge variant={supplement.active ? "secondary" : "destructive"}>{supplement.active ? "Active" : "Inactive"}</Badge>
                      </div>
                      <p>{[supplement.dose, supplement.frequency, supplement.time_of_day].filter(Boolean).join(" / ") || supplement.slug}</p>
                    </article>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2>Recent Recommendations</h2>
                <p>Latest recommendation runs generated by this user.</p>
              </CardHeader>
              <CardContent className="admin-detail-stack">
                {user.recent_recommendations.length === 0 ? (
                  <p className="empty-line">No recommendation runs yet.</p>
                ) : (
                  user.recent_recommendations.map((run) => (
                    <button className="detail-mini-card text-left" key={run.run_id} onClick={() => navigate(`/recommendations/${run.run_id}`)} type="button">
                      <div className="section-status-row">
                        <strong>{run.top_food || "No top food"}</strong>
                        <Badge variant="secondary">{run.item_count} items</Badge>
                      </div>
                      <p>
                        {formatDate(run.created_at)}
                        {run.top_score === null ? "" : ` / ${Math.round(run.top_score * 100)}% top match`}
                      </p>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2>Recent Feedback</h2>
                <p>Recent ratings attached to recommendation items.</p>
              </CardHeader>
              <CardContent className="admin-detail-stack">
                {user.recent_feedback.length === 0 ? (
                  <p className="empty-line">No feedback yet.</p>
                ) : (
                  user.recent_feedback.map((feedback) => (
                    <article className="detail-mini-card" key={feedback.id}>
                      <div className="section-status-row">
                        <strong>{feedback.food}</strong>
                        <Badge variant={feedback.is_helpful ? "secondary" : "destructive"}>{feedback.rating}/5</Badge>
                      </div>
                      <p>{feedback.comment || "No comment."}</p>
                    </article>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
