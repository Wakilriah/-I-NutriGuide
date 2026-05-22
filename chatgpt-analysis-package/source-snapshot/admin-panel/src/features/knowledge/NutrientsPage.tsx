import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, FlaskConical, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import {
  createNutrient,
  deleteNutrient,
  fetchPaginatedNutrients,
  type Nutrient,
  type NutrientPayload,
  updateNutrient,
} from "../../api/nutrients";
import { AdminPagination } from "../../components/admin/AdminPagination";
import { MetricSkeletonGrid, TableSkeleton } from "../../components/admin/LoadingStates";
import { StatCard } from "../../components/admin/StatCard";
import { Button } from "../../components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { invalidateDashboard } from "../../lib/query-keys";

const PAGE_SIZE = 10;

const nutrientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  unit: z.string().min(1, "Unit is required.").max(20, "Unit must be 20 characters or less."),
  description: z.string().max(1000, "Description must be 1000 characters or less.").optional(),
});

type NutrientFormValues = z.infer<typeof nutrientSchema>;

const defaultValues: NutrientFormValues = {
  name: "",
  unit: "mg",
  description: "",
};

export function NutrientsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingNutrient, setEditingNutrient] = useState<Nutrient | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const page = Number(searchParams.get("nutrients_page") || "1");
  const search = searchParams.get("nutrients_search") || "";

  const queryParams = useMemo(() => ({ page, page_size: PAGE_SIZE, search: search || undefined }), [page, search]);
  const { data, isError, isLoading } = useQuery({
    queryKey: ["nutrients", queryParams],
    queryFn: () => fetchPaginatedNutrients(queryParams),
  });

  const nutrients = data?.results ?? [];
  const totalNutrients = data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalNutrients / PAGE_SIZE));

  const form = useForm<NutrientFormValues>({
    resolver: zodResolver(nutrientSchema),
    defaultValues,
  });

  useEffect(() => {
    if (editingNutrient) {
      form.reset({
        name: editingNutrient.name,
        unit: editingNutrient.unit,
        description: editingNutrient.description,
      });
    } else {
      form.reset(defaultValues);
    }
  }, [editingNutrient, form]);

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

  const refreshNutrients = async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["nutrients"] }), invalidateDashboard(queryClient)]);
  };

  const saveMutation = useMutation({
    mutationFn: (values: NutrientPayload) =>
      editingNutrient ? updateNutrient(editingNutrient.slug, values) : createNutrient(values),
    onError: () => setFormError("Unable to save this nutrient."),
    onSuccess: async () => {
      setFormError(null);
      setEditingNutrient(null);
      setIsDialogOpen(false);
      form.reset(defaultValues);
      await refreshNutrients();
    },
  });

  const deleteMutation = useMutation({
    mutationKey: ["nutrients", "delete"],
    mutationFn: deleteNutrient,
    onSuccess: refreshNutrients,
  });

  const openCreateDialog = () => {
    setFormError(null);
    setEditingNutrient(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (nutrient: Nutrient) => {
    setFormError(null);
    setEditingNutrient(nutrient);
    setIsDialogOpen(true);
  };

  const handleSubmit = form.handleSubmit((values) => {
    saveMutation.mutate({
      name: values.name.trim(),
      unit: values.unit.trim(),
      description: values.description?.trim() ?? "",
    });
  });

  return (
    <>
      <div className="section-status-row">
        <h2>Nutrients</h2>
        <span className={isError ? "status-pill status-pill-error" : "status-pill"}>
          {isLoading ? "Loading" : isError ? "API unavailable" : `${totalNutrients} records`}
        </span>
      </div>
      {isLoading && !data ? (
        <MetricSkeletonGrid count={3} />
      ) : (
        <div className="metric-grid compact-metric-grid">
          <StatCard icon={FlaskConical} label="Nutrients" value={totalNutrients} />
          <StatCard icon={FlaskConical} label="Visible Units" value={new Set(nutrients.map((nutrient) => nutrient.unit)).size} />
          <StatCard icon={FlaskConical} label="Documented" value={nutrients.filter((nutrient) => nutrient.description).length} />
        </div>
      )}

      <section className="panel">
        <div className="table-header table-header-split">
          <div>
            <h2>Nutrient Catalog</h2>
            <p>Reference nutrients used in foods, supplements, and scoring.</p>
          </div>
          <div className="row-actions">
            <div className="search-row">
              <Search aria-hidden="true" size={17} />
              <input
                aria-label="Search nutrients"
                onChange={(event) => updateSearch({ nutrients_search: event.target.value, nutrients_page: 1 })}
                placeholder="Search"
                type="search"
                value={search}
              />
            </div>
            <Button onClick={openCreateDialog} type="button">
              <Plus aria-hidden="true" size={17} />
              Add Nutrient
            </Button>
          </div>
        </div>

        {isLoading && nutrients.length === 0 ? (
          <TableSkeleton columns={4} rows={PAGE_SIZE} />
        ) : nutrients.length === 0 ? (
          <p className="empty-line">{isError ? "Unable to load nutrients." : "No nutrients found."}</p>
        ) : (
          <div className="card-list-grid">
            {nutrients.map((nutrient) => (
              <article className="summary-card" key={nutrient.slug}>
                <div>
                  <h3>{nutrient.name}</h3>
                  <p>{nutrient.slug}</p>
                </div>
                <p>{nutrient.description || "No description yet."}</p>
                <div className="section-status-row">
                  <span className="soft-badge soft-badge-green">{nutrient.unit}</span>
                  <div className="row-actions">
                    <Button aria-label={`Edit ${nutrient.name}`} onClick={() => openEditDialog(nutrient)} size="icon" type="button" variant="outline">
                      <Edit3 aria-hidden="true" size={16} />
                    </Button>
                    <Button
                      aria-label={`Delete ${nutrient.name}`}
                      disabled={deleteMutation.isPending && deleteMutation.variables === nutrient.slug}
                      onClick={() => deleteMutation.mutate(nutrient.slug)}
                      size="icon"
                      type="button"
                      variant="destructive"
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="pagination-row">
          <div className="pagination-meta">Page {page} of {pageCount}</div>
          <AdminPagination disabled={isLoading} onPageChange={(nextPage) => updateSearch({ nutrients_page: nextPage })} page={page} pageCount={pageCount} />
        </div>
      </section>

      <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div>
              <DialogTitle>{editingNutrient ? "Edit Nutrient" : "Create Nutrient"}</DialogTitle>
              <DialogDescription>{editingNutrient ? editingNutrient.slug : "Add a nutrient to the recommendation knowledge base."}</DialogDescription>
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
              <span>Unit</span>
              <Input type="text" {...form.register("unit")} />
              {form.formState.errors.unit ? <small>{form.formState.errors.unit.message}</small> : null}
            </Label>
            <Label>
              <span>Description</span>
              <Textarea rows={5} {...form.register("description")} />
            </Label>
            {formError ? <p className="form-error">{formError}</p> : null}
            <div className="form-actions">
              <Button disabled={saveMutation.isPending} type="submit">
                <Plus aria-hidden="true" size={18} />
                {saveMutation.isPending ? "Saving" : editingNutrient ? "Save Nutrient" : "Create Nutrient"}
              </Button>
              <Button onClick={() => setIsDialogOpen(false)} type="button" variant="outline">
                <X aria-hidden="true" size={16} />
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
