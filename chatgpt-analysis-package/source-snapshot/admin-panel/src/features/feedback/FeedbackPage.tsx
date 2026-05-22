import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Search, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchPaginatedFeedback } from "../../api/feedback";
import { AdminPagination } from "../../components/admin/AdminPagination";
import { MetricSkeletonGrid, TableSkeleton } from "../../components/admin/LoadingStates";
import { StatCard } from "../../components/admin/StatCard";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";

const PAGE_SIZE = 12;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function FeedbackPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const rating = searchParams.get("rating") || "";
  const helpful = searchParams.get("helpful") || "";

  const queryParams = useMemo(
    () => ({
      page,
      page_size: PAGE_SIZE,
      search: search || undefined,
      rating: rating ? Number(rating) : undefined,
      is_helpful: helpful ? (helpful as "true" | "false") : undefined,
    }),
    [helpful, page, rating, search],
  );

  const { data, isError, isLoading } = useQuery({
    queryKey: ["feedback", queryParams],
    queryFn: () => fetchPaginatedFeedback(queryParams),
  });

  const feedback = data?.results ?? [];
  const totalFeedback = data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalFeedback / PAGE_SIZE));
  const averageRating = feedback.length > 0 ? feedback.reduce((total, item) => total + item.rating, 0) / feedback.length : 0;
  const helpfulCount = feedback.filter((item) => item.is_helpful).length;

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
    <section className="feedback-view" aria-labelledby="feedback-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">User Signal</p>
          <h1 id="feedback-title">Feedback</h1>
        </div>
        <span className={isError ? "status-pill status-pill-error" : "status-pill"}>
          {isLoading ? "Loading" : isError ? "API unavailable" : `${totalFeedback} responses`}
        </span>
      </div>

      {isLoading && !data ? (
        <MetricSkeletonGrid count={4} />
      ) : (
        <div className="metric-grid compact-metric-grid">
          <StatCard icon={MessageSquare} label="Responses" value={totalFeedback} />
          <StatCard icon={Star} label="Page Avg Rating" value={averageRating.toFixed(1)} />
          <StatCard icon={ThumbsUp} label="Helpful On Page" value={helpfulCount} />
          <StatCard icon={ThumbsDown} label="Not Helpful" value={feedback.length - helpfulCount} />
        </div>
      )}

      <Card>
        <CardHeader className="food-list-header">
          <div>
            <CardTitle>Feedback Responses</CardTitle>
            <CardDescription>Review ratings and comments submitted from recommendation cards.</CardDescription>
          </div>
          <div className="row-actions">
            <div className="search-row">
              <Search aria-hidden="true" size={17} />
              <input
                aria-label="Search feedback"
                onChange={(event) => updateSearch({ search: event.target.value, page: 1 })}
                placeholder="Search"
                type="search"
                value={search}
              />
            </div>
            <select aria-label="Filter feedback by rating" onChange={(event) => updateSearch({ rating: event.target.value, page: 1 })} value={rating}>
              <option value="">All ratings</option>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>{value} stars</option>
              ))}
            </select>
            <select aria-label="Filter feedback by helpful" onChange={(event) => updateSearch({ helpful: event.target.value, page: 1 })} value={helpful}>
              <option value="">All helpful</option>
              <option value="true">Helpful</option>
              <option value="false">Not helpful</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {isLoading && feedback.length === 0 ? (
            <TableSkeleton columns={4} rows={PAGE_SIZE} />
          ) : feedback.length === 0 ? (
            <p className="empty-line">{isError ? "Unable to load feedback." : "No feedback found."}</p>
          ) : (
            <div className="card-list-grid">
              {feedback.map((item) => (
                <article className="summary-card" key={item.id}>
                  <div className="section-status-row">
                    <div>
                      <h3>{item.recommendation_item.food.name}</h3>
                      <p>{item.user_email}</p>
                    </div>
                    <Badge variant={item.is_helpful ? "secondary" : "destructive"}>{item.is_helpful ? "Helpful" : "Not helpful"}</Badge>
                  </div>
                  <p>{item.comment || "No comment."}</p>
                  <div className="section-status-row">
                    <span className="soft-badge soft-badge-green">{item.rating}/5</span>
                    <p>{formatDate(item.created_at)}</p>
                  </div>
                </article>
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
