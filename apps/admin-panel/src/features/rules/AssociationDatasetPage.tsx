import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, LinkIcon, Search, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  fetchAssociationTransactions,
  fetchMinedAssociationRules,
  fetchSafetyConstraints,
  fetchSupplementCategories,
  fetchSupplementNormalizations,
  fetchSynergySeedRules,
  updateMinedAssociationRule,
  updateSafetyConstraint,
  updateSynergySeedRule,
  type MinedAssociationRule,
  type SafetyConstraint,
  type SynergySeedRule,
} from "../../api/association-dataset";
import { TableSkeleton } from "../../components/admin/LoadingStates";
import { StatCard } from "../../components/admin/StatCard";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";

const PAGE_SIZE = 8;

export function AssociationDatasetPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [ruleType, setRuleType] = useState("");
  const [minConfidence, setMinConfidence] = useState("");
  const [minLift, setMinLift] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [constraintType, setConstraintType] = useState("");
  const queryParams = useMemo(
    () => ({
      page: 1,
      page_size: PAGE_SIZE,
      search: search || undefined,
      rule_type: ruleType || undefined,
      min_confidence: minConfidence || undefined,
      min_lift: minLift || undefined,
      is_active: activeFilter ? (activeFilter as "true" | "false") : undefined,
    }),
    [activeFilter, minConfidence, minLift, ruleType, search],
  );

  const categories = useQuery({ queryKey: ["association-dataset", "categories"], queryFn: () => fetchSupplementCategories({ page: 1, page_size: PAGE_SIZE }) });
  const normalizations = useQuery({ queryKey: ["association-dataset", "normalizations", queryParams], queryFn: () => fetchSupplementNormalizations(queryParams) });
  const synergies = useQuery({ queryKey: ["association-dataset", "synergies", queryParams], queryFn: () => fetchSynergySeedRules(queryParams) });
  const safetyParams = useMemo(
    () => ({ page: 1, page_size: PAGE_SIZE, search: search || undefined, constraint_type: constraintType || undefined, is_active: activeFilter ? (activeFilter as "true" | "false") : undefined }),
    [activeFilter, constraintType, search],
  );
  const safety = useQuery({ queryKey: ["association-dataset", "safety", safetyParams], queryFn: () => fetchSafetyConstraints(safetyParams) });
  const mined = useQuery({ queryKey: ["association-dataset", "mined", queryParams], queryFn: () => fetchMinedAssociationRules(queryParams) });
  const transactions = useQuery({ queryKey: ["association-dataset", "transactions", search], queryFn: () => fetchAssociationTransactions({ page: 1, page_size: PAGE_SIZE, search: search || undefined }) });

  const toggleSynergy = useMutation({
    mutationFn: (rule: SynergySeedRule) => updateSynergySeedRule(rule.id, { is_active: !rule.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["association-dataset", "synergies"] }),
  });
  const toggleSafety = useMutation({
    mutationFn: (rule: SafetyConstraint) => updateSafetyConstraint(rule.id, { is_active: !rule.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["association-dataset", "safety"] }),
  });
  const toggleMined = useMutation({
    mutationFn: (rule: MinedAssociationRule) => updateMinedAssociationRule(rule.id, { is_active: !rule.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["association-dataset", "mined"] }),
  });
  const reviewMined = useMutation({
    mutationFn: ({ id, review_status }: { id: number; review_status: MinedAssociationRule["review_status"] }) => updateMinedAssociationRule(id, { review_status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["association-dataset", "mined"] }),
  });

  return (
    <section className="rules-view" aria-labelledby="association-dataset-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Association Dataset</p>
          <h1 id="association-dataset-title">Supplement-Food Rule Data</h1>
          <p className="page-heading-copy">Seed rules, mined rules, transaction rows, and safety constraints stay here as auditable source data.</p>
        </div>
        <span className="status-pill">{transactions.data?.count ?? 0} transactions</span>
      </div>

      <div className="metric-grid compact-metric-grid">
        <StatCard icon={Database} label="Categories" value={categories.data?.count ?? 0} helper="canonical supplement items" />
        <StatCard icon={Database} label="Normalizations" value={normalizations.data?.count ?? 0} helper="raw names mapped" />
        <StatCard icon={ShieldCheck} label="Seed Rules" value={synergies.data?.count ?? 0} helper="positive food signals" />
        <StatCard icon={ShieldCheck} label="Safety Rules" value={safety.data?.count ?? 0} helper="not used as positives" />
        <StatCard icon={ShieldCheck} label="Mined Rules" value={mined.data?.count ?? 0} helper="Apriori output" />
        <StatCard icon={Database} label="Transactions" value={transactions.data?.count ?? 0} helper="training inputs" />
      </div>

      <section className="panel">
        <div className="table-header table-header-split">
          <div>
            <h2>Dataset Controls</h2>
            <p>Search mappings, seed rules, safety constraints, mined rules, and transaction rows.</p>
          </div>
          <div className="row-actions">
            <div className="search-row">
              <Search aria-hidden="true" size={17} />
              <input aria-label="Search association dataset" onChange={(event) => setSearch(event.target.value)} placeholder="Supplement or food" type="search" value={search} />
            </div>
            <select aria-label="Filter mined rules by rule type" onChange={(event) => setRuleType(event.target.value)} value={ruleType}>
              <option value="">All rule types</option>
              <option value="positive_synergy">Positive synergy</option>
              <option value="neutral_pattern">Neutral pattern</option>
              <option value="avoid_timing">Avoid timing</option>
              <option value="medical_caution">Medical caution</option>
            </select>
            <select aria-label="Filter safety constraints by type" onChange={(event) => setConstraintType(event.target.value)} value={constraintType}>
              <option value="">All constraints</option>
              <option value="avoid_timing">Avoid timing</option>
              <option value="medical_review">Medical review</option>
              <option value="medical_caution">Medical caution</option>
              <option value="exclusion">Exclusion</option>
            </select>
            <select aria-label="Filter dataset rows by status" onChange={(event) => setActiveFilter(event.target.value)} value={activeFilter}>
              <option value="">All status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <Input aria-label="Minimum confidence" min="0" max="1" onChange={(event) => setMinConfidence(event.target.value)} placeholder="Min confidence" step="0.05" type="number" value={minConfidence} />
            <Input aria-label="Minimum lift" min="0" onChange={(event) => setMinLift(event.target.value)} placeholder="Min lift" step="0.05" type="number" value={minLift} />
          </div>
        </div>
      </section>

      <DatasetTable
        columns={["Category", "Item", "Nutrient", "Source"]}
        count={categories.data?.count ?? 0}
        description="Canonical supplement association items used internally by mining and recommendation matching."
        isLoading={categories.isLoading}
        rows={(categories.data?.results ?? []).map((item) => [
          item.category,
          item.association_item,
          item.main_nutrient,
          sourceLink(item.source_url),
        ])}
        title="Supplement Categories"
      />

      <DatasetTable
        columns={["Original", "Normalized", "Canonical Item", "Keyword", "Notes"]}
        count={normalizations.data?.count ?? 0}
        description="Raw supplement labels are normalized before Apriori matching so aliases do not fragment the model."
        isLoading={normalizations.isLoading}
        rows={(normalizations.data?.results ?? []).map((item) => [
          item.original_supplement_name,
          item.normalized_category,
          item.canonical_item ? `supp:${item.canonical_item}` : "Unmapped",
          item.primary_keyword,
          item.notes,
        ])}
        title="Normalization Mappings"
      />

      <ActionTable
        columns={["Supplement", "Food", "Weight", "Relation", "Reason", "Status"]}
        count={synergies.data?.count ?? 0}
        description="Positive supplement-food seed rules can boost ranking but still pass through safety filtering."
        isLoading={synergies.isLoading}
        rows={(synergies.data?.results ?? []).map((item) => ({
          id: item.id,
          cells: [item.supplement_item, item.food_item, item.seed_weight.toFixed(2), readableLabel(item.nutrient_relation), item.reason, statusBadge(item.is_active)],
          onToggle: () => toggleSynergy.mutate(item),
          toggleLabel: item.is_active ? "Disable" : "Enable",
        }))}
        title="Synergy Seed Rules"
      />

      <ActionTable
        columns={["Supplement", "Constraint", "Type", "Level", "Safety Note", "How To Use", "Status"]}
        count={safety.data?.count ?? 0}
        description="Safety constraints are reviewed by the medical safety layer and are never treated as positive rules."
        isLoading={safety.isLoading}
        rows={(safety.data?.results ?? []).map((item) => ({
          id: item.id,
          cells: [item.supplement_category_name, item.avoid_or_review_item, readableLabel(item.constraint_type), levelBadge(item.safety_level), item.reason, item.how_to_use, statusBadge(item.is_active)],
          onToggle: () => toggleSafety.mutate(item),
          toggleLabel: item.is_active ? "Disable" : "Enable",
        }))}
        title="Safety Constraints"
      />

      <ActionTable
        columns={["Antecedent", "Consequent", "Confidence", "Lift", "Review", "Safety Conflict", "Actions", "Status"]}
        count={mined.data?.count ?? 0}
        description="Mined rules are calculated from imported transactions and separated by rule type."
        isLoading={mined.isLoading}
        rows={(mined.data?.results ?? []).map((item) => ({
          id: item.id,
          cells: [
            item.antecedent_items.join(", "),
            item.consequent_items.join(", "),
            item.confidence.toFixed(2),
            item.lift.toFixed(2),
            reviewBadge(item.review_status),
            conflictBadge(item.safety_conflict_status),
            reviewButtons(item, (review_status) => reviewMined.mutate({ id: item.id, review_status })),
            statusBadge(item.is_active),
          ],
          onToggle: () => toggleMined.mutate(item),
          toggleLabel: item.is_active ? "Disable" : "Enable",
        }))}
        title="Mined Association Rules"
      />

      <DatasetTable
        columns={["Transaction", "Items", "Preview", "One-Hot Items", "Source"]}
        count={transactions.data?.count ?? 0}
        description="Transactions_Long drives mining; one-hot rows are kept for direct Apriori mode and review."
        isLoading={transactions.isLoading}
        rows={(transactions.data?.results ?? []).map((item) => [
          item.transaction_id,
          String(item.item_count),
          previewItems(item.items.map((row) => row.item)),
          String(item.one_hot_items.length),
          item.source,
        ])}
        title="Transaction Viewer"
      />
    </section>
  );
}

function DatasetTable({ columns, count, description, isLoading, rows, title }: { columns: string[]; count: number; description: string; isLoading: boolean; rows: Array<Array<ReactNode>>; title: string }) {
  return (
    <section className="panel">
      <div className="table-header">
        <div className="section-status-row">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <Badge variant="outline">{count} rows</Badge>
        </div>
      </div>
      {isLoading ? <TableSkeleton columns={columns.length} rows={PAGE_SIZE} /> : <SimpleTable columns={columns} rows={rows} />}
    </section>
  );
}

function ActionTable({ columns, count, description, isLoading, rows, title }: { columns: string[]; count: number; description: string; isLoading: boolean; rows: Array<{ id: number; cells: Array<ReactNode>; onToggle: () => void; toggleLabel: string }>; title: string }) {
  return (
    <section className="panel">
      <div className="table-header">
        <div className="section-status-row">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <Badge variant="outline">{count} rows</Badge>
        </div>
      </div>
      {isLoading ? (
        <TableSkeleton columns={columns.length + 1} rows={PAGE_SIZE} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => <TableHead key={column}>{column}</TableHead>)}
              <TableHead aria-label="Actions" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {row.cells.map((cell, index) => <TableCell key={`${row.id}-${index}`}>{cell}</TableCell>)}
                <TableCell><Button onClick={row.onToggle} type="button" variant="outline">{row.toggleLabel}</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

function SimpleTable({ columns, rows }: { columns: string[]; rows: Array<Array<ReactNode>> }) {
  if (!rows.length) {
    return <p className="empty-line">No rows found.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>{columns.map((column) => <TableHead key={column}>{column}</TableHead>)}</TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, rowIndex) => (
          <TableRow key={rowIndex}>
            {row.map((cell, cellIndex) => <TableCell key={`${rowIndex}-${cellIndex}`}>{cell}</TableCell>)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function statusBadge(isActive: boolean) {
  return <Badge variant={isActive ? "secondary" : "destructive"}>{isActive ? "Active" : "Inactive"}</Badge>;
}

function levelBadge(level: string) {
  return <Badge variant={level === "HIGH" ? "destructive" : level === "MEDIUM" ? "secondary" : "outline"}>{level}</Badge>;
}

function reviewBadge(status: string) {
  const variant = status === "approved" ? "secondary" : status === "rejected" ? "destructive" : "outline";
  return <Badge variant={variant}>{readableLabel(status)}</Badge>;
}

function conflictBadge(status: string) {
  const variant = status === "conflict_blocking" ? "destructive" : status === "conflict_warning" ? "secondary" : "outline";
  return <Badge variant={variant}>{readableLabel(status)}</Badge>;
}

function reviewButtons(rule: MinedAssociationRule, onReview: (status: MinedAssociationRule["review_status"]) => void) {
  return (
    <div className="row-actions">
      <Button disabled={rule.review_status === "approved"} onClick={() => onReview("approved")} type="button" variant="outline">Approve</Button>
      <Button disabled={rule.review_status === "rejected"} onClick={() => onReview("rejected")} type="button" variant="outline">Reject</Button>
      <Button disabled={rule.review_status === "needs_review"} onClick={() => onReview("needs_review")} type="button" variant="outline">Review</Button>
    </div>
  );
}

function sourceLink(url: string) {
  if (!url) {
    return "No source";
  }
  return (
    <a href={url} rel="noreferrer" target="_blank">
      <LinkIcon aria-hidden="true" size={14} /> Source
    </a>
  );
}

function previewItems(items: string[]) {
  if (!items.length) {
    return "No items";
  }
  const preview = items.slice(0, 5).join(", ");
  return items.length > 5 ? `${preview} +${items.length - 5}` : preview;
}

function readableLabel(value: string) {
  return value ? value.replace(/_/g, " ") : "Unknown";
}
