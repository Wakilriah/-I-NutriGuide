import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Apple,
  Database,
  MessageSquare,
  Pill,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchDashboardMetrics, type DashboardMetrics } from "../../api/dashboard";
import { ChartSkeleton, MetricSkeletonGrid } from "../../components/admin/LoadingStates";
import { StatCard } from "../../components/admin/StatCard";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { queryKeys } from "../../lib/query-keys";

export function DashboardPage() {
  const { data, dataUpdatedAt, isError, isFetching, isLoading, refetch } = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: fetchDashboardMetrics,
    placeholderData: (previousData) => previousData,
    refetchInterval: 60_000,
  });

  const isInitialLoading = isLoading && !data;
  const dashboard = data;
  const lastSynced = dataUpdatedAt ? formatDateTime(dataUpdatedAt) : "Not synced yet";

  const readiness = useMemo(() => buildReadinessRows(dashboard), [dashboard]);
  const accountMix = useMemo(() => buildAccountRows(dashboard), [dashboard]);

  return (
    <section className="dashboard-view" aria-labelledby="dashboard-title">
      <div className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="eyebrow">Operations</p>
          <h1 id="dashboard-title">Dashboard</h1>
          <p>Monitor data quality, recommendation activity, rule coverage, and user growth from one synced view.</p>
        </div>
        <div className="dashboard-actions">
          <Badge variant={isError ? "destructive" : isFetching ? "outline" : "secondary"}>
            {isError ? "API unavailable" : isFetching ? "Syncing" : "Live"}
          </Badge>
          <Button disabled={isFetching} onClick={() => void refetch()} type="button" variant="outline">
            <RefreshCw aria-hidden="true" size={16} />
            Refresh
          </Button>
        </div>
        <div className="dashboard-hero-metrics">
          <HeroMetric label="Last Sync" loading={isInitialLoading} value={lastSynced} />
          <HeroMetric label="Survey Users" loading={isInitialLoading} value={formatNumber(dashboard?.survey_users ?? 0)} />
          <HeroMetric label="Avg Match" loading={isInitialLoading} value={formatPercent(dashboard?.average_recommendation_score ?? 0)} />
        </div>
      </div>

      {isError && !dashboard ? (
        <Card>
          <CardHeader>
            <CardTitle>Dashboard could not load</CardTitle>
            <CardDescription>The API did not return metrics. Retry once the backend is reachable.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void refetch()} type="button">
              <RefreshCw aria-hidden="true" size={16} />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isInitialLoading ? (
        <MetricSkeletonGrid count={8} />
      ) : dashboard ? (
        <div className="metric-grid dashboard-metric-grid">
          <StatCard icon={Users} label="Users" value={formatNumber(dashboard.total_users)} helper={`${formatNumber(dashboard.active_users)} active`} />
          <StatCard icon={Database} label="Foods" value={formatNumber(dashboard.total_foods)} helper={`${formatNumber(dashboard.active_foods)} active`} />
          <StatCard icon={Apple} label="Nutrients" value={formatNumber(dashboard.total_nutrients)} helper={`${formatNumber(dashboard.ciqual_foods)} CIQUAL foods`} />
          <StatCard
            icon={Pill}
            label="Supplements"
            value={formatNumber(dashboard.total_supplements)}
            helper={`${formatNumber(dashboard.user_supplement_entries)} user links`}
          />
          <StatCard
            icon={Activity}
            label="Recommendation Runs"
            value={formatNumber(dashboard.total_recommendations)}
            helper={`${formatNumber(dashboard.total_recommendation_items)} items`}
          />
          <StatCard icon={TrendingUp} label="Avg Match" value={formatPercent(dashboard.average_recommendation_score)} />
          <StatCard icon={MessageSquare} label="Feedback" value={formatNumber(dashboard.total_feedback)} helper={`${formatPercent(ratio(dashboard.helpful_feedback, dashboard.total_feedback))} helpful`} />
          <StatCard
            icon={ShieldCheck}
            label="Active Rules"
            value={formatNumber(dashboard.active_association_rules)}
            helper={`${formatNumber(dashboard.total_association_rules)} total`}
          />
        </div>
      ) : null}

      {dashboard ? (
        <div className="dashboard-main-grid">
          <ChartPanel
            data={dashboard.food_category_counts.map((item) => ({
              label: item.category__name || "Uncategorized",
              count: item.count,
            }))}
            emptyLabel="No food categories yet."
            isLoading={isInitialLoading}
            title="Food Coverage"
          />

          <Card>
            <CardHeader>
              <CardTitle>Operational Readiness</CardTitle>
              <CardDescription>Coverage checks from the latest dashboard query.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProgressList items={readiness} />
            </CardContent>
          </Card>

          <ChartPanel
            data={dashboard.rule_usage.map((item) => ({
              label: item.label,
              count: item.count,
            }))}
            emptyLabel="Rules have not matched recommendations yet."
            isLoading={isInitialLoading}
            title="Association Rule Usage"
          />

          <Card>
            <CardHeader>
              <CardTitle>User Mix</CardTitle>
              <CardDescription>Account health and survey import coverage.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProgressList items={accountMix} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {dashboard ? (
        <div className="dashboard-list-grid">
          <Card>
            <CardHeader>
              <CardTitle>Supplement Demand</CardTitle>
              <CardDescription>Most common supplements users added.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataList
                emptyLabel="No supplement usage yet."
                items={dashboard.most_used_supplements.map((item) => ({
                  label: item.supplement__name,
                  value: item.count,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommended Foods</CardTitle>
              <CardDescription>Foods appearing most often in generated runs.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataList
                emptyLabel="No recommendation history yet."
                items={dashboard.most_recommended_foods.map((item) => ({
                  label: item.food__name,
                  value: item.count,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved Foods</CardTitle>
              <CardDescription>Foods users decided to keep.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataList
                emptyLabel="No saved foods yet."
                items={dashboard.most_saved_foods.map((item) => ({
                  label: item.recommendation_item__food__name,
                  value: item.count,
                }))}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  );
}

function HeroMetric({ label, loading, value }: { label: string; loading: boolean; value: string }) {
  return (
    <div className="dashboard-hero-metric">
      <span>{label}</span>
      {loading ? <Skeleton className="mt-2 h-5 w-24" /> : <strong>{value}</strong>}
    </div>
  );
}

function DataList({ emptyLabel, items }: { emptyLabel: string; items: Array<{ label: string; value: number }> }) {
  if (items.length === 0) {
    return <p className="empty-line">{emptyLabel}</p>;
  }

  return (
    <ul className="data-list dashboard-data-list">
      {items.map((item) => (
        <li key={item.label}>
          <span>{item.label || "Unknown"}</span>
          <strong>{formatNumber(item.value)}</strong>
        </li>
      ))}
    </ul>
  );
}

function ProgressList({ items }: { items: Array<{ label: string; value: number; detail: string }> }) {
  return (
    <ul className="dashboard-progress-list">
      {items.map((item) => (
        <li key={item.label}>
          <div>
            <span>{item.label}</span>
            <strong>{formatPercent(item.value)}</strong>
          </div>
          <div className="dashboard-progress-track" aria-hidden="true">
            <span style={{ width: `${Math.round(item.value * 100)}%` }} />
          </div>
          <p>{item.detail}</p>
        </li>
      ))}
    </ul>
  );
}

function ChartPanel({
  data,
  emptyLabel,
  isLoading,
  title,
}: {
  data: Array<{ label: string; count: number }>;
  emptyLabel: string;
  isLoading?: boolean;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Counts from the live admin analytics endpoint.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ChartSkeleton />
        ) : data.length === 0 ? (
          <p className="empty-line">{emptyLabel}</p>
        ) : (
          <div className="chart-frame">
            <ResponsiveContainer height={250} width="100%">
              <BarChart data={data} margin={{ bottom: 8, left: -18, right: 8, top: 8 }}>
                <CartesianGrid stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" interval={0} tick={{ fontSize: 11 }} tickFormatter={(value) => truncate(String(value), 16)} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2f7d32" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function buildReadinessRows(metrics?: DashboardMetrics) {
  if (!metrics) {
    return [];
  }
  return [
    {
      label: "Active Foods",
      value: ratio(metrics.active_foods, metrics.total_foods),
      detail: `${formatNumber(metrics.active_foods)} of ${formatNumber(metrics.total_foods)} foods are enabled`,
    },
    {
      label: "CIQUAL Coverage",
      value: ratio(metrics.ciqual_foods, metrics.total_foods),
      detail: `${formatNumber(metrics.ciqual_foods)} foods imported from CIQUAL`,
    },
    {
      label: "Active Supplements",
      value: ratio(metrics.active_supplements, metrics.total_supplements),
      detail: `${formatNumber(metrics.active_supplements)} of ${formatNumber(metrics.total_supplements)} supplements are enabled`,
    },
    {
      label: "Rule Coverage",
      value: ratio(metrics.recommendation_items_with_rules, metrics.total_recommendation_items),
      detail: `${formatNumber(metrics.recommendation_items_with_rules)} recommendation items matched rules`,
    },
  ];
}

function buildAccountRows(metrics?: DashboardMetrics) {
  if (!metrics) {
    return [];
  }
  return [
    {
      label: "Active Accounts",
      value: ratio(metrics.active_users, metrics.total_users),
      detail: `${formatNumber(metrics.active_users)} active users`,
    },
    {
      label: "Survey Dataset",
      value: ratio(metrics.survey_users, metrics.total_users),
      detail: `${formatNumber(metrics.survey_users)} anonymized survey users`,
    },
    {
      label: "Admins",
      value: ratio(metrics.admin_users, metrics.total_users),
      detail: `${formatNumber(metrics.admin_users)} admin accounts`,
    },
    {
      label: "Helpful Feedback",
      value: ratio(metrics.helpful_feedback, metrics.total_feedback),
      detail: `${formatNumber(metrics.helpful_feedback)} helpful responses`,
    },
  ];
}

function ratio(value: number, total: number) {
  if (!total) {
    return 0;
  }
  return Math.max(0, Math.min(1, value / total));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDateTime(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 1)}...` : value;
}
