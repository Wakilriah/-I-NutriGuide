import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { fetchDataQualityReport, type DataQualityIssue } from "../../api/dashboard";
import { StatCard } from "../../components/admin/StatCard";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";

export function DataQualityPage() {
  const { data, dataUpdatedAt, isError, isFetching, isLoading, refetch } = useQuery({
    queryKey: ["admin-data-quality"],
    queryFn: fetchDataQualityReport,
    placeholderData: (previousData) => previousData,
    refetchInterval: 60_000,
  });

  const hasIssues = Boolean(data?.total_issues);

  return (
    <section className="panel" aria-labelledby="data-quality-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Imports</p>
          <h1 id="data-quality-title">Data Quality</h1>
          <p>Find incomplete imported foods, supplements, rules, and interaction records before they affect recommendations.</p>
        </div>
        <div className="page-actions">
          <Badge variant={isError ? "destructive" : isFetching ? "outline" : hasIssues ? "secondary" : "default"}>
            {isError ? "API unavailable" : isFetching ? "Syncing" : hasIssues ? "Needs review" : "Clean"}
          </Badge>
          <Button disabled={isFetching} onClick={() => void refetch()} type="button" variant="outline">
            <RefreshCw aria-hidden="true" size={16} />
            Refresh
          </Button>
        </div>
      </div>

      {isError && !data ? (
        <Card>
          <CardHeader>
            <CardTitle>Data quality report could not load</CardTitle>
            <CardDescription>The backend did not return issue counts. Retry once the API is reachable.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void refetch()} type="button">
              <RefreshCw aria-hidden="true" size={16} />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isLoading && !data ? (
        <DataQualitySkeleton />
      ) : data ? (
        <>
          <div className="metric-grid">
            <StatCard icon={AlertTriangle} label="Total Issues" value={formatNumber(data.total_issues)} helper="Across all checks" />
            <StatCard icon={CheckCircle2} label="Affected Categories" value={formatNumber(data.issue_categories)} helper={formatSyncTime(dataUpdatedAt)} />
          </div>

          <div className="data-quality-grid">
            {data.issues.map((issue) => (
              <IssueCard issue={issue} key={issue.key} />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function IssueCard({ issue }: { issue: DataQualityIssue }) {
  return (
    <Card className={issue.count ? "data-quality-card has-issues" : "data-quality-card"}>
      <CardHeader>
        <div className="data-quality-card-header">
          <div>
            <CardTitle>{issue.label}</CardTitle>
            <CardDescription>{issue.count ? `${formatNumber(issue.count)} records need review` : "No issues found"}</CardDescription>
          </div>
          <Badge variant={issue.count ? severityVariant(issue.severity) : "outline"}>{issue.count ? issue.severity : "clear"}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {issue.samples.length ? <SampleList samples={issue.samples} /> : <p className="empty-line">No sample records.</p>}
      </CardContent>
    </Card>
  );
}

function SampleList({ samples }: { samples: DataQualityIssue["samples"] }) {
  return (
    <ul className="data-list data-quality-samples">
      {samples.map((sample, index) => (
        <li key={`${sample.id ?? index}`}>
          <span>{sampleLabel(sample)}</span>
          <small>{sampleMeta(sample)}</small>
        </li>
      ))}
    </ul>
  );
}

function DataQualitySkeleton() {
  return (
    <div className="data-quality-grid">
      {Array.from({ length: 6 }, (_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function sampleLabel(sample: DataQualityIssue["samples"][number]) {
  const label = sample.name ?? sample.food__name ?? sample.supplement__name ?? sample.nutrient__name ?? sample.antecedent_slug ?? sample.source_key ?? sample.id;
  return String(label ?? "Unknown record");
}

function sampleMeta(sample: DataQualityIssue["samples"][number]) {
  const parts = [
    sample.slug,
    sample.food__slug,
    sample.supplement__slug,
    sample.nutrient__slug,
    sample.source,
    sample.source_id,
    sample.ciqual_code,
    sample.missing,
  ]
    .flat()
    .filter(Boolean);
  return parts.length ? parts.join(" | ") : `ID ${sample.id ?? "unknown"}`;
}

function severityVariant(severity: DataQualityIssue["severity"]) {
  return severity === "high" ? "destructive" : "secondary";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatSyncTime(value: number) {
  return value ? `Synced ${new Date(value).toLocaleTimeString()}` : "Not synced yet";
}
