import { useQuery } from "@tanstack/react-query";
import { Database, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { fetchSafetyConstraints } from "../../api/association-dataset";
import { fetchPaginatedNutrientInteractions } from "../../api/interactions";
import { ListSkeleton } from "../../components/admin/LoadingStates";
import { StatCard } from "../../components/admin/StatCard";
import { Badge } from "../../components/ui/badge";

export function InteractionsPage() {
  const [search, setSearch] = useState("");
  const [interactionType, setInteractionType] = useState("");
  const [severity, setSeverity] = useState("");
  const [constraintType, setConstraintType] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const { data: interactionData, isError, isLoading } = useQuery({
    queryKey: ["nutrient-interactions", search, interactionType, severity],
    queryFn: () => fetchPaginatedNutrientInteractions({
      page: 1,
      page_size: 100,
      search: search || undefined,
      interaction_type: interactionType || undefined,
      severity: severity || undefined,
    }),
  });
  const { data: safetyConstraints, isError: isSafetyError, isLoading: isSafetyLoading } = useQuery({
    queryKey: ["association-dataset", "safety", "knowledge", search, constraintType, activeFilter],
    queryFn: () => fetchSafetyConstraints({
      page: 1,
      page_size: 100,
      search: search || undefined,
      constraint_type: constraintType || undefined,
      is_active: activeFilter ? (activeFilter as "true" | "false") : undefined,
    }),
  });

  const interactions = interactionData?.results ?? [];
  const safetyRows = safetyConstraints?.results ?? [];
  const activeInteractions = interactions.filter((interaction) => interaction.active).length;
  const activeSafetyRows = safetyRows.filter((constraint) => constraint.is_active).length;
  const totalInteractionKnowledge = (interactionData?.count ?? interactions.length) + (safetyConstraints?.count ?? safetyRows.length);
  const activeInteractionKnowledge = activeInteractions + activeSafetyRows;

  return (
    <>
      <div className="metric-grid compact-metric-grid">
        <StatCard icon={Database} label="Interaction Knowledge" value={totalInteractionKnowledge} helper={`${activeInteractionKnowledge} active rules`} />
        <StatCard icon={Database} label="Nutrient Interactions" value={interactionData?.count ?? interactions.length} helper={`${activeInteractions} active`} />
        <StatCard icon={ShieldCheck} label="Safety Constraints" value={safetyConstraints?.count ?? 0} helper={`${activeSafetyRows} active`} />
        <StatCard icon={ShieldCheck} label="Warnings" value={interactions.filter((interaction) => interaction.severity === "warning").length} />
        <StatCard icon={ShieldCheck} label="Timing Rules" value={safetyRows.filter((constraint) => constraint.constraint_type === "avoid_timing").length} />
      </div>

      <section className="panel">
        <div className="table-header table-header-split">
          <div>
            <h2>Interaction Controls</h2>
            <p>Review nutrient interactions and imported safety constraints used by warnings and explanations.</p>
          </div>
          <div className="row-actions">
            <div className="search-row">
              <Search aria-hidden="true" size={17} />
              <input aria-label="Search interactions" onChange={(event) => setSearch(event.target.value)} placeholder="Search source, target, supplement" type="search" value={search} />
            </div>
            <select aria-label="Filter by interaction type" onChange={(event) => setInteractionType(event.target.value)} value={interactionType}>
              <option value="">All nutrient types</option>
              <option value="enhances">Enhances</option>
              <option value="inhibits">Inhibits</option>
              <option value="requires">Requires</option>
              <option value="should_not_combine">Should not combine</option>
              <option value="supports">Supports</option>
            </select>
            <select aria-label="Filter by severity" onChange={(event) => setSeverity(event.target.value)} value={severity}>
              <option value="">All severities</option>
              <option value="info">Info</option>
              <option value="caution">Caution</option>
              <option value="warning">Warning</option>
            </select>
            <select aria-label="Filter by safety constraint type" onChange={(event) => setConstraintType(event.target.value)} value={constraintType}>
              <option value="">All safety types</option>
              <option value="avoid_timing">Avoid timing</option>
              <option value="medical_review">Medical review</option>
              <option value="medical_caution">Medical caution</option>
              <option value="exclusion">Exclusion</option>
            </select>
            <select aria-label="Filter safety constraints by status" onChange={(event) => setActiveFilter(event.target.value)} value={activeFilter}>
              <option value="">All status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="table-header">
          <div className="section-status-row">
            <div>
              <h2>Nutrient Interactions</h2>
              <p>Positive and cautionary nutrient relationships used in explanations and warning checks.</p>
            </div>
            <Badge variant="outline">{interactionData?.count ?? interactions.length} rows</Badge>
          </div>
        </div>
        {isLoading ? (
          <ListSkeleton rows={6} />
        ) : isError ? (
          <p className="empty-line">Unable to load nutrient interactions.</p>
        ) : interactions.length === 0 ? (
          <p className="empty-line">No interactions found.</p>
        ) : (
          <div className="card-list-grid">
            {interactions.map((interaction) => (
              <article className="summary-card" key={interaction.id}>
                <div className="section-status-row">
                  <div>
                    <h3>{interaction.source_key}{" -> "}{interaction.target_key}</h3>
                    <p>{interaction.mechanism}</p>
                  </div>
                  <Badge variant={interaction.active ? "secondary" : "outline"}>{interaction.active ? "Active" : "Inactive"}</Badge>
                </div>
                <div className="tag-list">
                  <Badge variant="outline">{interaction.source_type}</Badge>
                  <Badge variant="outline">{interaction.target_type}</Badge>
                  <Badge variant="outline">{readableLabel(interaction.interaction_type)}</Badge>
                  <Badge variant="outline">{interaction.evidence_level} evidence</Badge>
                  <Badge variant={interaction.severity === "warning" ? "destructive" : "secondary"}>{interaction.severity}</Badge>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="table-header">
          <div className="section-status-row">
            <div>
              <h2>Supplement Safety Constraints</h2>
              <p>Imported timing, caution, and review rules. These are intentionally separate from positive association rules.</p>
            </div>
            <Badge variant="outline">{safetyConstraints?.count ?? 0} rows</Badge>
          </div>
        </div>
        {isSafetyLoading ? (
          <ListSkeleton rows={6} />
        ) : isSafetyError ? (
          <p className="empty-line">Unable to load safety constraints.</p>
        ) : safetyRows.length === 0 ? (
          <p className="empty-line">No safety constraints found.</p>
        ) : (
          <div className="card-list-grid">
            {safetyRows.map((constraint) => (
              <article className="summary-card" key={constraint.id}>
                <div className="section-status-row">
                  <div>
                    <h3>{constraint.supplement_category_name}{" -> "}{constraint.avoid_or_review_item}</h3>
                    <p>{constraint.reason}</p>
                  </div>
                  <Badge variant={constraint.is_active ? "secondary" : "outline"}>{constraint.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                <p>{constraint.how_to_use}</p>
                <div className="tag-list">
                  <Badge variant={constraint.constraint_type === "medical_review" ? "destructive" : "outline"}>{readableLabel(constraint.constraint_type)}</Badge>
                  {constraint.source_url ? <a href={constraint.source_url} rel="noreferrer" target="_blank">Source</a> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function readableLabel(value: string) {
  return value ? value.replace(/_/g, " ") : "Unknown";
}
