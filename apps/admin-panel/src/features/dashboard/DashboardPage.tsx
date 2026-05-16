import { Activity, Apple, Bookmark, MessageSquare, Network, Pill, ShieldCheck, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchDashboardMetrics } from "../../api/dashboard";
import { ChartSkeleton, MetricSkeletonGrid } from "../../components/admin/LoadingStates";
import { StatCard } from "../../components/admin/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";

const fallbackMetrics = {
  total_users: 0,
  total_foods: 0,
  total_supplements: 0,
  total_recommendations: 0,
  average_feedback_rating: 0,
  total_saved_foods: 0,
  total_association_rules: 0,
  active_association_rules: 0,
  recommendation_items_with_rules: 0,
  average_rule_score: 0,
  most_used_supplements: [],
  most_recommended_foods: [],
  most_saved_foods: [],
  food_category_counts: [],
  food_source_counts: [],
  rule_usage: [],
};

export function DashboardPage() {
  const { data = fallbackMetrics, isError, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: fetchDashboardMetrics,
  });

  return (
    <section className="dashboard-view" aria-labelledby="dashboard-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Wellness intelligence</p>
          <h1 id="dashboard-title">Smart Food Match Dashboard</h1>
        </div>
        <span className={isError ? "status-pill status-pill-error" : "status-pill"}>
          {isLoading ? "Loading" : isError ? "API unavailable" : "Live"}
        </span>
      </div>

      {isLoading ? (
        <MetricSkeletonGrid count={8} />
      ) : (
        <div className="metric-grid">
          <StatCard icon={Users} label="Users" value={data.total_users} />
          <StatCard icon={Apple} label="Foods" value={data.total_foods} />
          <StatCard icon={Pill} label="Supplements" value={data.total_supplements} />
          <StatCard icon={Activity} label="Recommendation Runs" value={data.total_recommendations} />
          <StatCard icon={Bookmark} label="Saved Foods" value={data.total_saved_foods} />
          <StatCard icon={MessageSquare} label="Avg Feedback" value={data.average_feedback_rating.toFixed(1)} />
          <StatCard icon={ShieldCheck} label="Active Rules" value={data.active_association_rules} helper={`${data.total_association_rules} total`} />
          <StatCard
            icon={Network}
            label="Rule Matches"
            value={data.recommendation_items_with_rules}
            helper={`${Math.round(data.average_rule_score * 100)}% avg signal`}
          />
        </div>
      )}

      <div className="dashboard-columns">
        <ChartPanel
          data={data.food_category_counts.map((item) => ({
            label: item.category__name || "Uncategorized",
            count: item.count,
          }))}
          emptyLabel="No food categories yet."
          isLoading={isLoading}
          title="Food Coverage"
        />

        <ChartPanel
          data={data.rule_usage.map((item) => ({
            label: item.label,
            count: item.count,
          }))}
          emptyLabel="Rules have not matched recommendations yet."
          isLoading={isLoading}
          title="Association Rule Usage"
        />

        <Card>
          <CardHeader>
            <CardTitle>Daily Supplement Signals</CardTitle>
          </CardHeader>
          <CardContent>
          <DataList
            emptyLabel="No supplement usage yet."
            isLoading={isLoading}
            items={data.most_used_supplements.map((item) => ({
              label: item.supplement__name,
              value: item.count,
            }))}
          />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Healthy Food Pairings</CardTitle>
          </CardHeader>
          <CardContent>
          <DataList
            emptyLabel="No recommendation history yet."
            isLoading={isLoading}
            items={data.most_recommended_foods.map((item) => ({
              label: item.food__name,
              value: item.count,
            }))}
          />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Saved Foods</CardTitle>
          </CardHeader>
          <CardContent>
          <DataList
            emptyLabel="No saved foods yet."
            isLoading={isLoading}
            items={data.most_saved_foods.map((item) => ({
              label: item.recommendation_item__food__name,
              value: item.count,
            }))}
          />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function DataList({ emptyLabel, isLoading, items }: { emptyLabel: string; isLoading?: boolean; items: Array<{ label: string; value: number }> }) {
  if (isLoading) {
    return (
      <div className="data-list">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="flex min-h-[38px] items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2" key={index}>
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-5 w-8" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="empty-line">{emptyLabel}</p>;
  }

  return (
    <ul className="data-list">
      {items.map((item) => (
        <li key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
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
        <CardDescription>Counts from the admin analytics endpoint.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ChartSkeleton />
        ) : data.length === 0 ? (
          <p className="empty-line">{emptyLabel}</p>
        ) : (
          <div className="chart-frame">
            <ResponsiveContainer height={240} width="100%">
              <BarChart data={data} margin={{ bottom: 8, left: -24, right: 8, top: 8 }}>
                <CartesianGrid stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" interval={0} tick={{ fontSize: 11 }} tickFormatter={(value) => String(value).slice(0, 14)} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2f6b52" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
