import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { fetchNutrientInteractions } from "../../api/interactions";
import { ListSkeleton } from "../../components/admin/LoadingStates";
import { Badge } from "../../components/ui/badge";

export function InteractionsPage() {
  const [search, setSearch] = useState("");
  const [interactionType, setInteractionType] = useState("");
  const [severity, setSeverity] = useState("");
  const { data: interactions = [], isError, isLoading } = useQuery({
    queryKey: ["nutrient-interactions", search, interactionType, severity],
    queryFn: () => fetchNutrientInteractions({
      search: search || undefined,
      interaction_type: interactionType || undefined,
      severity: severity || undefined,
    }),
  });

  return (
    <section className="panel">
      <div className="table-header table-header-split">
        <div>
          <h2>Nutrient Interactions</h2>
          <p>Review active supplement, nutrient, and food interactions used by warnings and explanations.</p>
        </div>
        <div className="row-actions">
          <div className="search-row">
            <Search aria-hidden="true" size={17} />
            <input aria-label="Search nutrient interactions" onChange={(event) => setSearch(event.target.value)} placeholder="Search source or target" type="search" value={search} />
          </div>
          <select aria-label="Filter by interaction type" onChange={(event) => setInteractionType(event.target.value)} value={interactionType}>
            <option value="">All types</option>
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
                <Badge variant="outline">{interaction.interaction_type}</Badge>
                <Badge variant="outline">{interaction.evidence_level} evidence</Badge>
                <Badge variant={interaction.severity === "warning" ? "destructive" : "secondary"}>{interaction.severity}</Badge>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
