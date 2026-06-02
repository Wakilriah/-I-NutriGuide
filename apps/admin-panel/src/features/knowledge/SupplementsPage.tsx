import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, Edit3, Pill, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import { fetchNutrients } from "../../api/nutrients";
import { fetchSupplementCategories, fetchSupplementNormalizations, type SupplementCategory, type SupplementNormalization } from "../../api/association-dataset";
import {
  createSupplement,
  deleteSupplement,
  fetchPaginatedSupplements,
  type Supplement,
  type SupplementPayload,
  updateSupplement,
} from "../../api/supplements";
import { ConfirmDialog } from "../../components/admin/ConfirmDialog";
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

const supplementSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  description: z.string().max(1000, "Description must be 1000 characters or less.").optional(),
  common_dose: z.string().max(100, "Dose must be 100 characters or less.").optional(),
  is_active: z.boolean(),
  nutrient_items: z.array(
    z.object({
      nutrient_slug: z.string().optional(),
      amount: z.string().optional(),
    }),
  ),
});

type SupplementFormValues = z.infer<typeof supplementSchema>;

const defaultValues: SupplementFormValues = {
  name: "",
  description: "",
  common_dose: "",
  is_active: true,
  nutrient_items: [{ nutrient_slug: "", amount: "" }],
};

export function SupplementsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingSupplement, setEditingSupplement] = useState<Supplement | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [supplementToDelete, setSupplementToDelete] = useState<Supplement | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const page = Number(searchParams.get("supplements_page") || "1");
  const search = searchParams.get("supplements_search") || "";
  const statusFilter = searchParams.get("supplements_active") || "";

  const queryParams = useMemo(
    () => ({
      page,
      page_size: PAGE_SIZE,
      search: search || undefined,
      is_active: statusFilter ? (statusFilter as "true" | "false") : undefined,
    }),
    [page, search, statusFilter],
  );

  const { data, isError, isLoading } = useQuery({
    queryKey: ["supplements", queryParams],
    queryFn: () => fetchPaginatedSupplements(queryParams),
  });

  const { data: nutrients = [] } = useQuery({
    queryKey: ["nutrients"],
    queryFn: () => fetchNutrients(),
  });

  const { data: normalizationData } = useQuery({
    queryKey: ["association-dataset", "normalizations", "supplement-catalog", search, statusFilter],
    queryFn: () =>
      fetchSupplementNormalizations({
        page: 1,
        page_size: 12,
        search: search || undefined,
        is_active: statusFilter ? (statusFilter as "true" | "false") : undefined,
      }),
  });
  const { data: categoryData } = useQuery({
    queryKey: ["association-dataset", "categories", "supplement-catalog", search],
    queryFn: () => fetchSupplementCategories({ page: 1, page_size: 12, search: search || undefined }),
  });

  const supplements = data?.results ?? [];
  const normalizations = normalizationData?.results ?? [];
  const categories = categoryData?.results ?? [];
  const normalizationBySupplement = useMemo(() => buildNormalizationLookup(normalizations), [normalizations]);
  const totalSupplements = data?.count ?? 0;
  const totalNormalizations = normalizationData?.count ?? 0;
  const totalCategories = categoryData?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalSupplements / PAGE_SIZE));
  const activeSupplements = supplements.filter((supplement) => supplement.is_active).length;
  const nutrientLinks = supplements.reduce((total, supplement) => total + supplement.nutrients.length, 0);
  const activeNormalizations = normalizations.filter((normalization) => normalization.is_active).length;

  const form = useForm<SupplementFormValues>({
    resolver: zodResolver(supplementSchema),
    defaultValues,
  });

  const nutrientFields = useFieldArray({
    control: form.control,
    name: "nutrient_items",
  });

  useEffect(() => {
    form.reset(
      editingSupplement
        ? {
            name: editingSupplement.name,
            description: editingSupplement.description,
            common_dose: editingSupplement.common_dose,
            is_active: editingSupplement.is_active,
            nutrient_items:
              editingSupplement.nutrients.length > 0
                ? editingSupplement.nutrients.map((nutrient) => ({ nutrient_slug: nutrient.slug, amount: nutrient.amount ?? "" }))
                : [{ nutrient_slug: "", amount: "" }],
          }
        : defaultValues,
    );
  }, [editingSupplement, form]);

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

  const refreshSupplements = async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["supplements"] }), invalidateDashboard(queryClient)]);
  };

  const saveMutation = useMutation({
    mutationFn: (values: SupplementPayload) =>
      editingSupplement ? updateSupplement(editingSupplement.slug, values) : createSupplement(values),
    onError: () => setFormError("Unable to save this supplement."),
    onSuccess: async () => {
      setFormError(null);
      setEditingSupplement(null);
      setIsDialogOpen(false);
      form.reset(defaultValues);
      await refreshSupplements();
    },
  });

  const deleteMutation = useMutation({
    mutationKey: ["supplements", "delete"],
    mutationFn: deleteSupplement,
    onSuccess: async () => {
      setSupplementToDelete(null);
      await refreshSupplements();
    },
  });

  const openCreateDialog = () => {
    setFormError(null);
    setEditingSupplement(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (supplement: Supplement) => {
    setFormError(null);
    setEditingSupplement(supplement);
    setIsDialogOpen(true);
  };

  const handleSubmit = form.handleSubmit((values) => {
    saveMutation.mutate({
      name: values.name.trim(),
      description: values.description?.trim() ?? "",
      common_dose: values.common_dose?.trim() ?? "",
      is_active: values.is_active,
      nutrient_items: values.nutrient_items
        .filter((item) => item.nutrient_slug)
        .map((item) => {
          const selectedNutrient = nutrients.find((nutrient) => nutrient.slug === item.nutrient_slug);
          return {
            nutrient_slug: item.nutrient_slug ?? "",
            amount: item.amount || null,
            unit: selectedNutrient?.unit,
          };
        }),
    });
  });

  return (
    <>
      {isLoading && !data ? (
        <MetricSkeletonGrid count={3} />
      ) : (
        <div className="metric-grid compact-metric-grid">
          <StatCard icon={Pill} label="Supplement Catalog" value={totalSupplements} helper={`${activeSupplements} active on page`} />
          <StatCard icon={Database} label="Normalization Map" value={totalNormalizations} helper={`${activeNormalizations} active on page`} />
          <StatCard icon={Database} label="Canonical Categories" value={totalCategories} helper="Association rule items" />
          <StatCard icon={Pill} label="Active On Page" value={activeSupplements} />
          <StatCard icon={Pill} label="Nutrient Links" value={nutrientLinks} />
        </div>
      )}

      <section className="panel">
        <div className="table-header table-header-split">
          <div>
            <h2>Supplement Catalog</h2>
            <p>Supplements users can add to their profiles and recommendation context.</p>
          </div>
          <div className="row-actions">
            <div className="search-row">
              <Search aria-hidden="true" size={17} />
              <input
                aria-label="Search supplements"
                onChange={(event) => updateSearch({ supplements_search: event.target.value, supplements_page: 1 })}
                placeholder="Search"
                type="search"
                value={search}
              />
            </div>
            <select
              aria-label="Filter supplements by status"
              onChange={(event) => updateSearch({ supplements_active: event.target.value, supplements_page: 1 })}
              value={statusFilter}
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <Button onClick={openCreateDialog} type="button">
              <Plus aria-hidden="true" size={17} />
              Add Supplement
            </Button>
          </div>
        </div>

        {isLoading && supplements.length === 0 ? (
          <TableSkeleton columns={5} rows={PAGE_SIZE} />
        ) : supplements.length === 0 ? (
          <p className="empty-line">{isError ? "Unable to load supplements." : "No supplements found."}</p>
        ) : (
          <div className="card-list-grid">
            {supplements.map((supplement) => (
              <SupplementCard
                key={supplement.slug}
                normalization={getSupplementNormalization(supplement, normalizationBySupplement)}
                onDelete={() => setSupplementToDelete(supplement)}
                onEdit={() => openEditDialog(supplement)}
                isDeleting={deleteMutation.isPending && deleteMutation.variables === supplement.slug}
                supplement={supplement}
              />
            ))}
          </div>
        )}

        <div className="pagination-row">
          <div className="pagination-meta">Page {page} of {pageCount}</div>
          <AdminPagination disabled={isLoading} onPageChange={(nextPage) => updateSearch({ supplements_page: nextPage })} page={page} pageCount={pageCount} />
        </div>
      </section>

      <section className="panel">
        <div className="table-header table-header-split">
          <div>
            <h2>Imported Supplement Normalization</h2>
            <p>Original supplement names from the association dataset mapped to canonical rule items.</p>
          </div>
          <Badge variant="outline">{totalNormalizations} aliases</Badge>
        </div>
        {normalizations.length === 0 ? (
          <p className="empty-line">No imported normalization rows found.</p>
        ) : (
          <div className="card-list-grid">
            {normalizations.map((normalization) => (
              <NormalizationCard key={normalization.id} normalization={normalization} />
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="table-header table-header-split">
          <div>
            <h2>Canonical Supplement Categories</h2>
            <p>Stable association-rule categories used by mining, scoring, and recommendation explanations.</p>
          </div>
          <Badge variant="outline">{totalCategories} categories</Badge>
        </div>
        {categories.length === 0 ? (
          <p className="empty-line">No canonical supplement categories found.</p>
        ) : (
          <div className="card-list-grid compact-card-list-grid">
            {categories.map((category) => (
              <CategoryCard category={category} key={category.id} />
            ))}
          </div>
        )}
      </section>

      <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div>
              <DialogTitle>{editingSupplement ? "Edit Supplement" : "Create Supplement"}</DialogTitle>
              <DialogDescription>{editingSupplement ? editingSupplement.slug : "Add supplements users can select."}</DialogDescription>
            </div>
            <DialogClose onClose={() => setIsDialogOpen(false)} />
          </DialogHeader>
          <form className="resource-form p-5" onSubmit={handleSubmit}>
            <Label>
              <span>Name</span>
              <Input type="text" {...form.register("name")} />
              {form.formState.errors.name ? <small>{form.formState.errors.name.message}</small> : null}
            </Label>
            <Label>
              <span>Common Dose</span>
              <Input placeholder="18 mg daily" type="text" {...form.register("common_dose")} />
            </Label>
            <Label>
              <span>Description</span>
              <Textarea rows={4} {...form.register("description")} />
            </Label>
            <div className="nutrient-builder">
              <div className="table-header table-header-split">
                <div>
                  <h2>Linked Nutrients</h2>
                  <p>Attach one or more nutrients represented by this supplement.</p>
                </div>
                <Button onClick={() => nutrientFields.append({ nutrient_slug: "", amount: "" })} type="button" variant="secondary">
                  <Plus aria-hidden="true" size={16} />
                  Add Nutrient
                </Button>
              </div>
              {nutrientFields.fields.map((field, index) => (
                <div className="nutrient-row" key={field.id}>
                  <Label>
                    <span>Nutrient</span>
                    <select {...form.register(`nutrient_items.${index}.nutrient_slug`)}>
                      <option value="">No nutrient</option>
                      {nutrients.map((nutrient) => (
                        <option key={nutrient.slug} value={nutrient.slug}>
                          {nutrient.name} ({nutrient.unit})
                        </option>
                      ))}
                    </select>
                  </Label>
                  <Label>
                    <span>Nutrient Amount</span>
                    <Input min="0" step="0.001" type="number" {...form.register(`nutrient_items.${index}.amount`)} />
                  </Label>
                  <Button
                    aria-label={`Remove supplement nutrient row ${index + 1}`}
                    disabled={nutrientFields.fields.length === 1}
                    onClick={() => nutrientFields.remove(index)}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <X aria-hidden="true" size={16} />
                  </Button>
                </div>
              ))}
            </div>
            <Label className="checkbox-row">
              <input type="checkbox" {...form.register("is_active")} />
              <span>Active</span>
            </Label>
            {formError ? <p className="form-error">{formError}</p> : null}
            <div className="form-actions">
              <Button disabled={saveMutation.isPending} type="submit">
                <Plus aria-hidden="true" size={18} />
                {saveMutation.isPending ? "Saving" : editingSupplement ? "Save Supplement" : "Create Supplement"}
              </Button>
              <Button onClick={() => setIsDialogOpen(false)} type="button" variant="outline">
                <X aria-hidden="true" size={16} />
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        confirmLabel="Delete supplement"
        description={supplementToDelete ? `Delete ${supplementToDelete.name}? This cannot be undone.` : "Delete this supplement?"}
        isLoading={deleteMutation.isPending}
        onConfirm={() => supplementToDelete && deleteMutation.mutate(supplementToDelete.slug)}
        onOpenChange={(open) => !open && setSupplementToDelete(null)}
        open={Boolean(supplementToDelete)}
        title="Delete supplement"
      />
    </>
  );
}

function NormalizationCard({ normalization }: { normalization: SupplementNormalization }) {
  return (
    <article className="summary-card">
      <div className="section-status-row">
        <div>
          <h3>Alias: {normalization.original_supplement_name}</h3>
          <p>{normalization.notes || "Mapped from the imported association dataset."}</p>
        </div>
        <Badge variant={normalization.is_active ? "secondary" : "outline"}>{normalization.is_active ? "Active" : "Inactive"}</Badge>
      </div>
      <div className="tag-list">
        <Badge variant="secondary">Maps to {normalization.normalized_category}</Badge>
        {normalization.canonical_item ? <Badge variant="outline">supp:{normalization.canonical_item}</Badge> : null}
        {normalization.main_nutrient ? <Badge variant="outline">Nutrient: {normalization.main_nutrient}</Badge> : null}
      </div>
    </article>
  );
}

function CategoryCard({ category }: { category: SupplementCategory }) {
  return (
    <article className="summary-card">
      <div className="section-status-row">
        <div>
          <h3>Category: {category.category}</h3>
          <p>{category.main_nutrient ? `Main nutrient: ${category.main_nutrient}` : "Canonical supplement category"}</p>
        </div>
        <Badge variant={category.is_active ? "secondary" : "outline"}>{category.is_active ? "Active" : "Inactive"}</Badge>
      </div>
      <div className="tag-list">
        <Badge variant="secondary">{category.association_item}</Badge>
        {category.keywords.slice(0, 3).map((keyword) => (
          <Badge key={keyword} variant="outline">{keyword}</Badge>
        ))}
      </div>
    </article>
  );
}

function SupplementCard({
  isDeleting,
  normalization,
  onDelete,
  onEdit,
  supplement,
}: {
  isDeleting: boolean;
  normalization?: SupplementNormalization;
  onDelete: () => void;
  onEdit: () => void;
  supplement: Supplement;
}) {
  const associationItem = normalization?.canonical_item ? `supp:${normalization.canonical_item}` : "";
  return (
    <article className="summary-card">
      <div className="section-status-row">
        <div>
          <h3>{supplement.name}</h3>
          <p>{supplement.common_dose || supplement.slug}</p>
        </div>
        <Badge variant={supplement.is_active ? "secondary" : "destructive"}>{supplement.is_active ? "Active" : "Inactive"}</Badge>
      </div>
      <p>{supplement.description || "No description yet."}</p>
      <div className="tag-list">
        <Badge variant="outline">{supplement.source || "Manual"}</Badge>
        {normalization ? <Badge variant="secondary">Normalized: {normalization.normalized_category}</Badge> : <Badge variant="outline">No normalization</Badge>}
        {associationItem ? <Badge variant="outline">{associationItem}</Badge> : null}
      </div>
      <p>{supplement.nutrients.length ? supplement.nutrients.map((nutrient) => nutrient.name).join(", ") : "No linked nutrients"}</p>
      <div className="row-actions">
        <Button aria-label={`Edit ${supplement.name}`} onClick={onEdit} size="icon" type="button" variant="outline">
          <Edit3 aria-hidden="true" size={16} />
        </Button>
        <Button
          aria-label={`Delete ${supplement.name}`}
          disabled={isDeleting}
          onClick={onDelete}
          size="icon"
          type="button"
          variant="destructive"
        >
          <Trash2 aria-hidden="true" size={16} />
        </Button>
      </div>
    </article>
  );
}

function buildNormalizationLookup(normalizations: SupplementNormalization[]) {
  const lookup = new Map<string, SupplementNormalization>();
  normalizations.forEach((normalization) => {
    const canonicalItem = normalization.canonical_item ?? "";
    [
      normalization.original_supplement_slug,
      normalization.original_supplement_name,
      normalization.normalized_category,
      canonicalItem,
      canonicalItem.replace(/_/g, "-"),
    ].forEach((value) => {
      const key = canonicalKey(value);
      if (key && !lookup.has(key)) {
        lookup.set(key, normalization);
      }
    });
  });
  return lookup;
}

function getSupplementNormalization(supplement: Supplement, lookup: Map<string, SupplementNormalization>) {
  return lookup.get(canonicalKey(supplement.slug)) ?? lookup.get(canonicalKey(supplement.name));
}

function canonicalKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
