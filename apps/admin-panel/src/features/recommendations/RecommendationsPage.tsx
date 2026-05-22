import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowLeft, Network, Search, Target, Utensils } from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { fetchAdminRecommendationRun, fetchPaginatedAdminRecommendationRuns, type AdminRecommendationRun, type RecommendationItem } from "../../api/recommendations";
import { AdminPagination } from "../../components/admin/AdminPagination";
import { ListSkeleton, MetricSkeletonGrid } from "../../components/admin/LoadingStates";
import { StatCard } from "../../components/admin/StatCard";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";

const PAGE_SIZE = 10;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function RecommendationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const supplement = searchParams.get("supplement") || "";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";
  const queryParams = useMemo(
    () => ({
      page,
      page_size: PAGE_SIZE,
      search: search || undefined,
      supplement: supplement || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
    [dateFrom, dateTo, page, search, supplement],
  );

  const { data, isError, isLoading } = useQuery({
    queryKey: ["admin-recommendations", queryParams],
    queryFn: () => fetchPaginatedAdminRecommendationRuns(queryParams),
  });

  const runs = data?.results ?? [];
  const totalRuns = data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalRuns / PAGE_SIZE));
  const allItems = runs.flatMap((run) => run.items);
  const averageScore = average(allItems.map((item) => item.confidence_score ?? item.score));
  const averageRuleScore = average(allItems.map((item) => item.rule_score));
  const ruleMatchedItems = allItems.filter((item) => item.matched_rules.length > 0 || item.rule_score > 0).length;

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
    <section className="recommendations-view" aria-labelledby="recommendations-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">User Outcomes</p>
          <h1 id="recommendations-title">Recommendations</h1>
        </div>
        <span className={isError ? "status-pill status-pill-error" : "status-pill"}>
          {isLoading ? "Loading" : isError ? "API unavailable" : `${totalRuns} runs`}
        </span>
      </div>

      {isLoading && !data ? (
        <MetricSkeletonGrid count={4} />
      ) : (
        <div className="metric-grid compact-metric-grid">
          <StatCard icon={Activity} label="Runs" value={totalRuns} />
          <StatCard icon={Utensils} label="Visible Items" value={allItems.length} />
          <StatCard icon={Target} label="Avg Match" value={`${Math.round(averageScore * 100)}%`} />
          <StatCard icon={Network} label="Rule Signal" value={`${Math.round(averageRuleScore * 100)}%`} helper={`${ruleMatchedItems} rule-backed items`} />
        </div>
      )}

      <section className="panel">
        <div className="table-header table-header-split">
          <div>
            <h2>Recommendation Runs</h2>
            <p>Open a run to review the selected user's recommendation details.</p>
          </div>
          <div className="row-actions">
            <div className="search-row">
              <Search aria-hidden="true" size={17} />
              <input
                aria-label="Search recommendation runs"
                onChange={(event) => updateSearch({ search: event.target.value, page: 1 })}
                placeholder="Search by email"
                type="search"
                value={search}
              />
            </div>
            <input
              aria-label="Filter recommendations by supplement"
              onChange={(event) => updateSearch({ supplement: event.target.value, page: 1 })}
              placeholder="Supplement slug"
              type="search"
              value={supplement}
            />
            <input
              aria-label="Filter recommendations from date"
              onChange={(event) => updateSearch({ date_from: event.target.value, page: 1 })}
              type="date"
              value={dateFrom}
            />
            <input
              aria-label="Filter recommendations to date"
              onChange={(event) => updateSearch({ date_to: event.target.value, page: 1 })}
              type="date"
              value={dateTo}
            />
          </div>
        </div>

        {isLoading && runs.length === 0 ? (
          <ListSkeleton rows={PAGE_SIZE} />
        ) : runs.length === 0 ? (
          <p className="empty-line">{isError ? "Unable to load recommendations." : "No recommendation runs found."}</p>
        ) : (
          <div className="card-list-grid">
            {runs.map((run) => (
              <RecommendationRunCard key={run.run_id} onOpen={() => navigate(`/recommendations/${run.run_id}`)} run={run} />
            ))}
          </div>
        )}

        <div className="pagination-row">
          <div className="pagination-meta">Page {page} of {pageCount}</div>
          <AdminPagination disabled={isLoading} onPageChange={(nextPage) => updateSearch({ page: nextPage })} page={page} pageCount={pageCount} />
        </div>
      </section>
    </section>
  );
}

export function RecommendationDetailPage() {
  const navigate = useNavigate();
  const { runId = "" } = useParams();
  const { data: run, isError, isLoading } = useQuery({
    queryKey: ["admin-recommendation", runId],
    queryFn: () => fetchAdminRecommendationRun(runId),
    enabled: Boolean(runId),
  });

  const items = run?.items ?? [];
  const averageScore = average(items.map((item) => item.confidence_score ?? item.score));
  const averageRuleScore = average(items.map((item) => item.rule_score));

  return (
    <section className="recommendations-view" aria-labelledby="recommendation-detail-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Recommendation Detail</p>
          <h1 id="recommendation-detail-title">{run ? run.user.name || run.user.email : "Recommendation Run"}</h1>
        </div>
        <Button onClick={() => navigate("/recommendations")} type="button" variant="outline">
          <ArrowLeft aria-hidden="true" size={17} />
          Back
        </Button>
      </div>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError || !run ? (
        <p className="empty-line">Unable to load this recommendation run.</p>
      ) : (
        <>
          <div className="metric-grid compact-metric-grid">
            <StatCard icon={Utensils} label="Items" value={items.length} />
            <StatCard icon={Target} label="Average Match" value={`${Math.round(averageScore * 100)}%`} />
            <StatCard icon={Network} label="Average Rule Score" value={`${Math.round(averageRuleScore * 100)}%`} />
            <StatCard icon={Activity} label="Created" value={formatDate(run.created_at)} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{run.user.email}</CardTitle>
              <CardDescription>{run.disclaimer}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="card-list-grid">
                {items.map((item) => (
                  <article className="summary-card" key={item.id}>
                    <div className="section-status-row">
                      <div>
                        <h3>#{item.rank} {item.food.name}</h3>
                        <p>{item.food.category}</p>
                      </div>
                      <Badge variant="secondary">{item.confidence_label ?? "Confidence"} {Math.round((item.confidence_score ?? item.score) * 100)}%</Badge>
                    </div>
                    <p>{explanationSummary(item.explanation)}</p>
                    {item.warnings.length ? (
                      <div className="alert-stack">
                        {item.warnings.map((warning, index) => (
                          <p className="empty-line" key={`${warningTitle(warning)}-${index}`}>{warningTitle(warning)}: {warningMessage(warning)}</p>
                        ))}
                      </div>
                    ) : null}
                    <div className="rule-metric-stack">
                      {Object.entries(item.score_breakdown ?? {
                        nutrient_score: item.nutrient_score,
                        rule_score: item.rule_score,
                        preference_score: item.preference_score,
                      }).map(([label, value]) => (
                        <ScoreMetric key={label} label={scoreLabel(label)} value={Number(value)} />
                      ))}
                    </div>
                    {typeof item.explanation !== "string" && item.explanation.reasons?.length ? (
                      <div className="tag-list">
                        {item.explanation.reasons.slice(0, 4).map((reason) => (
                          <Badge key={`${reason.type}-${reason.title}`} variant="outline">{reason.title}</Badge>
                        ))}
                      </div>
                    ) : null}
                    {item.feedback?.user_feedback ? <p>Feedback: {item.feedback.user_feedback.feedback_type}</p> : null}
                    <p>{item.matched_rules.length ? `${item.matched_rules.length} matched rules` : "No rule match"}</p>
                  </article>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}

function RecommendationRunCard({ onOpen, run }: { onOpen: () => void; run: AdminRecommendationRun }) {
  const topItem = run.items[0];
  const ruleMatches = run.items.filter((item) => item.matched_rules.length > 0 || item.rule_score > 0).length;
  return (
    <button className="summary-card text-left" onClick={onOpen} type="button">
      <div className="section-status-row">
        <div>
          <h3>{run.user.name || run.user.email}</h3>
          <p>{run.user.email}</p>
        </div>
        <Badge variant="secondary">{run.items.length} items</Badge>
      </div>
      <p>{topItem ? `Top match: ${topItem.food.name}` : "No items generated."}</p>
      <div className="section-status-row">
        <p>{formatDate(run.created_at)}</p>
        <p>{ruleMatches} rule-backed</p>
      </div>
    </button>
  );
}

function ScoreMetric({ label, value }: { label: string; value: number }) {
  const percent = Math.max(0, Math.min(100, value * 100));
  return (
    <div className="rule-metric">
      <div>
        <span>{label}</span>
        <strong>{value.toFixed(2)}</strong>
      </div>
      <div aria-hidden="true" className="rule-meter">
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function explanationSummary(value: RecommendationItem["explanation"]) {
  return typeof value === "string" ? value : value.summary;
}

function warningTitle(value: RecommendationItem["warnings"][number]) {
  return typeof value === "string" ? "Warning" : value.title;
}

function warningMessage(value: RecommendationItem["warnings"][number]) {
  return typeof value === "string" ? value : value.message;
}

function scoreLabel(value: string) {
  return value
    .replace(/_score$/u, "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}
