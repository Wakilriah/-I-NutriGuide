import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, GitBranch, Save, ShieldCheck, Sparkles } from "lucide-react";
import { fetchEvaluationMetrics, fetchKnowledgeGraph } from "../../api/recommendations";
import { EmptyState } from "../../components/admin/EmptyState";
import { StatCard } from "../../components/admin/StatCard";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export function EvaluationPage() {
  const metrics = useQuery({ queryKey: ["evaluation-metrics"], queryFn: () => fetchEvaluationMetrics() });
  const graph = useQuery({ queryKey: ["knowledge-graph"], queryFn: () => fetchKnowledgeGraph() });

  const data = metrics.data;
  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Final project evidence</p>
          <h1>Evaluation & Knowledge Graph</h1>
          <p className="page-subtitle">Quality metrics, safety monitoring, and supplement-food-nutrient graph data for the recommender.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={Sparkles} label="Precision@K" value={percent(data?.precision_at_k)} helper="positive feedback share" />
        <StatCard icon={Activity} label="NDCG" value={percent(data?.ndcg)} helper="ranking quality" />
        <StatCard icon={ShieldCheck} label="Safety Violation Rate" value={percent(data?.safety_violation_rate)} helper="reported safety issues" />
        <StatCard icon={Save} label="Save Rate" value={percent(data?.user_save_rate)} helper="user saved recommendations" />
      </div>

      <div className="content-grid">
        <Card>
          <CardHeader>
            <CardTitle>Recommendation Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.isLoading ? (
              <p className="muted">Loading metrics...</p>
            ) : data ? (
              <div className="metric-list">
                <Metric label="Recall@K" value={percent(data.recall_at_k)} />
                <Metric label="Coverage" value={percent(data.coverage)} />
                <Metric label="Diversity" value={percent(data.diversity)} />
                <Metric label="Average confidence" value={percent(data.average_confidence)} />
                <Metric label="Rule hit rate" value={percent(data.rule_hit_rate)} />
                <Metric label="Acceptance rate" value={percent(data.recommendation_acceptance_rate)} />
              </div>
            ) : (
              <EmptyState message="No metrics available. Generate recommendations and feedback to populate evaluation data." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>High-Risk Issues</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.high_risk_issues.length ? (
              <div className="metric-list">
                {data.high_risk_issues.map((issue) => (
                  <div className="metric-row" key={`${issue.type}-${issue.message}`}>
                    <span><AlertTriangle size={15} /> {issue.message}</span>
                    <Badge variant="secondary">{issue.type.replace(/_/g, " ")}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No high-risk issues were detected in the current evaluation window." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Knowledge Graph Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {graph.data ? (
            <div className="metric-list">
              <Metric label="Nodes" value={String(graph.data.nodes.length)} />
              <Metric label="Edges" value={String(graph.data.edges.length)} />
              {graph.data.edges.slice(0, 8).map((edge) => (
                <div className="metric-row" key={`${edge.source}-${edge.target}-${edge.type}`}>
                  <span><GitBranch size={15} /> {edge.source} {"->"} {edge.target}</span>
                  <Badge variant={edge.type.includes("inhibit") || edge.type === "safety_warning" ? "destructive" : "secondary"}>{edge.type}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Loading graph data...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function percent(value?: number) {
  return `${Math.round((value ?? 0) * 100)}%`;
}
