import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Network, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import {
  createAssociationRule,
  deleteAssociationRule,
  fetchPaginatedAssociationRules,
  type AssociationRule,
  type AssociationRulePayload,
  type EntityType,
  updateAssociationRule,
} from "../../api/rules";
import { AdminPagination } from "../../components/admin/AdminPagination";
import { MetricSkeletonGrid, TableSkeleton } from "../../components/admin/LoadingStates";
import { StatCard } from "../../components/admin/StatCard";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { invalidateDashboard } from "../../lib/query-keys";

const PAGE_SIZE = 10;
const entityTypes: EntityType[] = ["supplement", "nutrient", "food", "category"];

const ruleSchema = z.object({
  antecedent_type: z.enum(["supplement", "nutrient", "food", "category"]),
  antecedent_slug: z.string().min(1, "Antecedent slug is required."),
  consequent_type: z.enum(["supplement", "nutrient", "food", "category"]),
  consequent_slug: z.string().min(1, "Consequent slug is required."),
  support: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  lift: z.number().min(0),
  explanation: z.string().min(8, "Explanation is required."),
  is_active: z.boolean(),
});

type RuleFormValues = z.infer<typeof ruleSchema>;

const defaultValues: RuleFormValues = {
  antecedent_type: "supplement",
  antecedent_slug: "",
  consequent_type: "nutrient",
  consequent_slug: "",
  support: 0,
  confidence: 0,
  lift: 0,
  explanation: "",
  is_active: true,
};

export function RulesPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingRule, setEditingRule] = useState<AssociationRule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const page = Number(searchParams.get("rules_page") || "1");
  const search = searchParams.get("rules_search") || "";
  const statusFilter = searchParams.get("rules_active") || "";
  const entityFilter = searchParams.get("rules_entity") || "";

  const queryParams = useMemo(
    () => ({
      page,
      page_size: PAGE_SIZE,
      search: search || undefined,
      is_active: statusFilter ? (statusFilter as "true" | "false") : undefined,
      entity_type: entityFilter ? (entityFilter as EntityType) : undefined,
    }),
    [entityFilter, page, search, statusFilter],
  );

  const { data, isError, isLoading } = useQuery({
    queryKey: ["association-rules", queryParams],
    queryFn: () => fetchPaginatedAssociationRules(queryParams),
  });

  const rules = data?.results ?? [];
  const totalRules = data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalRules / PAGE_SIZE));
  const activeRules = rules.filter((rule) => rule.is_active).length;
  const averageConfidence = average(rules.map((rule) => rule.confidence));
  const averageLift = average(rules.map((rule) => rule.lift));
  const nutrientConsequents = rules.filter((rule) => rule.consequent_type === "nutrient").length;

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(
      editingRule
        ? {
            antecedent_type: editingRule.antecedent_type,
            antecedent_slug: editingRule.antecedent_slug,
            consequent_type: editingRule.consequent_type,
            consequent_slug: editingRule.consequent_slug,
            support: editingRule.support,
            confidence: editingRule.confidence,
            lift: editingRule.lift,
            explanation: editingRule.explanation,
            is_active: editingRule.is_active,
          }
        : defaultValues,
    );
  }, [editingRule, form]);

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

  const refreshRules = async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["association-rules"] }), invalidateDashboard(queryClient)]);
  };

  const saveMutation = useMutation({
    mutationFn: (values: AssociationRulePayload) =>
      editingRule ? updateAssociationRule(editingRule.id, values) : createAssociationRule(values),
    onError: () => setFormError("Unable to save this rule."),
    onSuccess: async () => {
      setFormError(null);
      setEditingRule(null);
      setIsDialogOpen(false);
      await refreshRules();
    },
  });

  const deleteMutation = useMutation({ mutationKey: ["association-rules", "delete"], mutationFn: deleteAssociationRule, onSuccess: refreshRules });

  const openCreateDialog = () => {
    setFormError(null);
    setEditingRule(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (rule: AssociationRule) => {
    setFormError(null);
    setEditingRule(rule);
    setIsDialogOpen(true);
  };

  const handleSubmit = form.handleSubmit((values) => {
    saveMutation.mutate({
      ...values,
      antecedent_slug: values.antecedent_slug.trim(),
      consequent_slug: values.consequent_slug.trim(),
      explanation: values.explanation.trim(),
    });
  });

  return (
    <section className="rules-view" aria-labelledby="rules-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Recommendation Logic</p>
          <h1 id="rules-title">Association Rules</h1>
        </div>
        <span className={isError ? "status-pill status-pill-error" : "status-pill"}>
          {isLoading ? "Loading" : isError ? "API unavailable" : `${totalRules} rules`}
        </span>
      </div>

      {isLoading && !data ? (
        <MetricSkeletonGrid count={4} />
      ) : (
        <div className="metric-grid compact-metric-grid">
          <StatCard icon={ShieldCheck} label="Active On Page" value={activeRules} helper={`${totalRules} total`} />
          <StatCard icon={Network} label="Avg Confidence" value={averageConfidence.toFixed(2)} />
          <StatCard icon={Network} label="Avg Lift" value={averageLift.toFixed(2)} />
          <StatCard icon={Network} label="Nutrient Consequents" value={nutrientConsequents} />
        </div>
      )}

      <section className="panel">
        <div className="table-header table-header-split">
          <div>
            <h2>Rule Library</h2>
            <p>Rules add evidence-based boosts to the recommendation ranking.</p>
          </div>
          <div className="row-actions">
            <div className="search-row">
              <Search aria-hidden="true" size={17} />
              <input
                aria-label="Search rules"
                onChange={(event) => updateSearch({ rules_search: event.target.value, rules_page: 1 })}
                placeholder="Search"
                type="search"
                value={search}
              />
            </div>
            <select aria-label="Filter rules by status" onChange={(event) => updateSearch({ rules_active: event.target.value, rules_page: 1 })} value={statusFilter}>
              <option value="">All status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <select aria-label="Filter rules by entity" onChange={(event) => updateSearch({ rules_entity: event.target.value, rules_page: 1 })} value={entityFilter}>
              <option value="">All entities</option>
              {entityTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <Button onClick={openCreateDialog} type="button">
              <Plus aria-hidden="true" size={17} />
              Add Rule
            </Button>
          </div>
        </div>

        {isLoading && rules.length === 0 ? (
          <TableSkeleton columns={5} rows={PAGE_SIZE} />
        ) : rules.length === 0 ? (
          <p className="empty-line">{isError ? "Unable to load rules." : "No rules found."}</p>
        ) : (
          <div className="card-list-grid">
            {rules.map((rule) => (
              <article className="summary-card" key={rule.id}>
                <div className="section-status-row">
                  <div>
                    <h3>
                      {rule.antecedent_slug} {"->"} {rule.consequent_slug}
                    </h3>
                    <p>
                      {rule.antecedent_type} to {rule.consequent_type}
                    </p>
                  </div>
                  <Badge variant={rule.is_active ? "secondary" : "destructive"}>{rule.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                <p>{rule.explanation}</p>
                <div className="rule-metric-stack">
                  <RuleMetric label="Support" value={rule.support} />
                  <RuleMetric label="Confidence" value={rule.confidence} />
                  <RuleMetric label="Lift" max={2} value={rule.lift} />
                </div>
                <div className="row-actions">
                  <Button aria-label={`Edit rule ${rule.id}`} onClick={() => openEditDialog(rule)} size="icon" type="button" variant="outline">
                    <Edit3 aria-hidden="true" size={16} />
                  </Button>
                  <Button
                    aria-label={`Delete rule ${rule.id}`}
                    disabled={deleteMutation.isPending && deleteMutation.variables === rule.id}
                    onClick={() => deleteMutation.mutate(rule.id)}
                    size="icon"
                    type="button"
                    variant="destructive"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="pagination-row">
          <div className="pagination-meta">Page {page} of {pageCount}</div>
          <AdminPagination disabled={isLoading} onPageChange={(nextPage) => updateSearch({ rules_page: nextPage })} page={page} pageCount={pageCount} />
        </div>
      </section>

      <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div>
              <DialogTitle>{editingRule ? "Edit Rule" : "Create Rule"}</DialogTitle>
              <DialogDescription>{editingRule ? `Rule ${editingRule.id}` : "Add a scoring relationship."}</DialogDescription>
            </div>
            <DialogClose onClose={() => setIsDialogOpen(false)} />
          </DialogHeader>
          <form className="resource-form p-5" onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <Label>
                <span>Antecedent Type</span>
                <select {...form.register("antecedent_type")}>{entityTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
              </Label>
              <Label>
                <span>Antecedent Slug</span>
                <Input type="text" {...form.register("antecedent_slug")} />
              </Label>
            </div>
            <div className="form-grid-2">
              <Label>
                <span>Consequent Type</span>
                <select {...form.register("consequent_type")}>{entityTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
              </Label>
              <Label>
                <span>Consequent Slug</span>
                <Input type="text" {...form.register("consequent_slug")} />
              </Label>
            </div>
            <div className="form-grid-3">
              <Label>
                <span>Support</span>
                <Input max="1" min="0" step="0.01" type="number" {...form.register("support", { valueAsNumber: true })} />
              </Label>
              <Label>
                <span>Confidence</span>
                <Input max="1" min="0" step="0.01" type="number" {...form.register("confidence", { valueAsNumber: true })} />
              </Label>
              <Label>
                <span>Lift</span>
                <Input min="0" step="0.01" type="number" {...form.register("lift", { valueAsNumber: true })} />
              </Label>
            </div>
            <Label>
              <span>Explanation</span>
              <Textarea rows={4} {...form.register("explanation")} />
            </Label>
            <Label className="checkbox-row">
              <input type="checkbox" {...form.register("is_active")} />
              <span>Enabled</span>
            </Label>
            {formError ? <p className="form-error">{formError}</p> : null}
            <div className="form-actions">
              <Button disabled={saveMutation.isPending} type="submit">
                <Plus aria-hidden="true" size={18} />
                {saveMutation.isPending ? "Saving" : editingRule ? "Save Rule" : "Create Rule"}
              </Button>
              <Button onClick={() => setIsDialogOpen(false)} type="button" variant="outline">
                <X aria-hidden="true" size={16} />
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function RuleMetric({ label, max = 1, value }: { label: string; max?: number; value: number }) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
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

function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}
