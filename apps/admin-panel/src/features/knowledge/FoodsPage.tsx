import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Apple, ChevronLeft, Edit3, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { z } from "zod";
import {
  createFood,
  deleteFood,
  fetchFood,
  fetchFoodCategories,
  fetchFoods,
  type FoodPayload,
  updateFood,
} from "../../api/foods";
import { fetchNutrients } from "../../api/nutrients";
import { MetricSkeletonGrid, TableSkeleton } from "../../components/admin/LoadingStates";
import { StatCard } from "../../components/admin/StatCard";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "../../components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Textarea } from "../../components/ui/textarea";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const foodSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  category_slug: z.string().min(2, "Category slug is required."),
  description: z.string().max(1000, "Description must be 1000 characters or less.").optional(),
  scientific_name: z.string().max(255, "Scientific name must be 255 characters or less.").optional(),
  source: z.string().max(50, "Source must be 50 characters or less.").optional(),
  serving_size_g: z.string().min(1, "Serving size is required."),
  image_url: z.union([z.string().url("Enter a valid image URL."), z.literal("")]).optional(),
  is_active: z.boolean(),
  nutrient_items: z.array(
    z.object({
      nutrient_slug: z.string().optional(),
      amount: z.string().optional(),
      per_quantity: z.string().optional(),
      per_unit: z.string().optional(),
    }),
  ),
});

type FoodFormValues = z.infer<typeof foodSchema>;

const defaultValues: FoodFormValues = {
  name: "",
  category_slug: "fruits",
  description: "",
  scientific_name: "",
  source: "",
  serving_size_g: "100",
  image_url: "",
  is_active: true,
  nutrient_items: [{ nutrient_slug: "", amount: "", per_quantity: "100", per_unit: "g" }],
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getPositiveNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getPageSize(value: string | null) {
  const parsed = getPositiveNumber(value, 25);
  return PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number])
    ? (parsed as (typeof PAGE_SIZE_OPTIONS)[number])
    : 25;
}

function getPaginationItems(currentPage: number, pageCount: number) {
  const boundaryPages = new Set([1, pageCount]);
  const siblingStart = Math.max(1, currentPage - 1);
  const siblingEnd = Math.min(pageCount, currentPage + 1);
  const items: Array<number | "ellipsis-left" | "ellipsis-right"> = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    if (boundaryPages.has(pageNumber) || (pageNumber >= siblingStart && pageNumber <= siblingEnd)) {
      items.push(pageNumber);
    }
  }

  return items.reduce<Array<number | "ellipsis-left" | "ellipsis-right">>((result, item, index) => {
    const previous = items[index - 1];
    if (typeof previous === "number" && typeof item === "number" && item - previous > 1) {
      result.push(previous === 1 ? "ellipsis-left" : "ellipsis-right");
    }
    result.push(item);
    return result;
  }, []);
}

export function FoodsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = getPositiveNumber(searchParams.get("page"), 1);
  const pageSize = getPageSize(searchParams.get("page_size"));
  const search = searchParams.get("search") ?? "";
  const categoryFilter = searchParams.get("category") ?? "";
  const sourceFilter = searchParams.get("source") ?? "";
  const statusFilter = searchParams.get("is_active") ?? "";

  const updateFoodSearch = (updates: Record<string, string | number | null | undefined>, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    if (resetPage) {
      next.set("page", "1");
    }
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });
    setSearchParams(next);
  };

  const queryParams = useMemo(
    () => ({
      page,
      page_size: pageSize,
      search: search.trim() || undefined,
      category: categoryFilter || undefined,
      source: sourceFilter || undefined,
      is_active: statusFilter ? (statusFilter as "true" | "false") : undefined,
    }),
    [categoryFilter, page, pageSize, search, sourceFilter, statusFilter],
  );

  const { data, isError, isLoading } = useQuery({
    queryKey: ["foods", queryParams],
    queryFn: () => fetchFoods(queryParams),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["food-categories"],
    queryFn: fetchFoodCategories,
  });

  const foods = data?.results ?? [];
  const totalFoods = data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalFoods / pageSize));
  const activeOnPage = foods.filter((food) => food.is_active).length;
  const ciqualOnPage = foods.filter((food) => food.source === "CIQUAL 2020").length;
  const nutrientLinksOnPage = foods.reduce((total, food) => total + food.nutrients.length, 0);

  const deleteMutation = useMutation({
    mutationKey: ["foods", "delete"],
    mutationFn: deleteFood,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["foods"] });
    },
  });

  return (
    <section className="foods-view" aria-labelledby="foods-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Food Knowledge</p>
          <h1 id="foods-title">Food Catalog</h1>
        </div>
        <Button onClick={() => navigate("/foods/new")} type="button">
          <Plus aria-hidden="true" size={18} />
          Add Food
        </Button>
      </div>

      {isLoading && !data ? (
        <MetricSkeletonGrid count={4} />
      ) : (
        <div className="metric-grid compact-metric-grid">
          <StatCard icon={Apple} label="Matching Foods" value={totalFoods} helper="Current filter result" />
          <StatCard icon={Apple} label="Active On Page" value={activeOnPage} />
          <StatCard icon={Apple} label="CIQUAL On Page" value={ciqualOnPage} />
          <StatCard icon={Apple} label="Nutrient Links" value={nutrientLinksOnPage} helper="Visible rows" />
        </div>
      )}

      <Card>
        <CardHeader className="food-list-header">
          <div>
            <CardTitle>Browse Foods</CardTitle>
            <CardDescription>Search, filter, and page through foods without loading the full catalog at once.</CardDescription>
          </div>
          <Badge variant={isError ? "destructive" : "secondary"}>
            {isLoading ? "Loading" : isError ? "API unavailable" : `${totalFoods} results`}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="food-filter-grid">
            <Label>
              <span>Search</span>
              <span className="filter-input-shell">
                <Search aria-hidden="true" size={16} />
                <Input
                  aria-label="Search foods"
                  onChange={(event) => {
                    updateFoodSearch({ search: event.target.value });
                  }}
                  placeholder="Name, slug, category, CIQUAL code"
                  type="search"
                  value={search}
                />
              </span>
            </Label>

            <Label>
              <span>Category</span>
              <select
                aria-label="Filter foods by category"
                onChange={(event) => {
                  updateFoodSearch({ category: event.target.value });
                }}
                value={categoryFilter}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Label>

            <Label>
              <span>Source</span>
              <select
                aria-label="Filter foods by source"
                onChange={(event) => {
                  updateFoodSearch({ source: event.target.value });
                }}
                value={sourceFilter}
              >
                <option value="">All sources</option>
                <option value="CIQUAL 2020">CIQUAL 2020</option>
                <option value="manual">Manual</option>
              </select>
            </Label>

            <Label>
              <span>Status</span>
              <select
                aria-label="Filter foods by status"
                onChange={(event) => {
                  updateFoodSearch({ is_active: event.target.value });
                }}
                value={statusFilter}
              >
                <option value="">All statuses</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </Label>
          </div>

          {isLoading && foods.length === 0 ? (
            <TableSkeleton columns={6} rows={pageSize > 10 ? 8 : pageSize} />
          ) : foods.length === 0 ? (
            <p className="empty-line">{isError ? "Unable to load foods." : "No foods found."}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Nutrients</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead aria-label="Actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {foods.map((food) => (
                  <TableRow key={food.slug}>
                    <TableCell>
                      <strong className="table-title">{food.name}</strong>
                      <span className="table-subtitle">{food.slug}</span>
                    </TableCell>
                    <TableCell>{food.category}</TableCell>
                    <TableCell>
                      {food.source || "Manual"}
                      {food.ciqual_code ? <span className="table-subtitle">CIQUAL {food.ciqual_code}</span> : null}
                    </TableCell>
                    <TableCell>
                      {food.nutrients.length > 0
                        ? food.nutrients.slice(0, 3).map((nutrient) => `${nutrient.name} ${nutrient.amount}${nutrient.unit}`).join(", ")
                        : "No nutrients"}
                      {food.nutrients.length > 3 ? <span className="table-subtitle">+{food.nutrients.length - 3} more</span> : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={food.is_active ? "secondary" : "destructive"}>{food.is_active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="row-actions">
                        <Button
                          aria-label={`Edit ${food.name}`}
                          onClick={() => navigate(`/foods/${food.slug}/edit`)}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          <Edit3 aria-hidden="true" size={16} />
                        </Button>
                        <Button
                          aria-label={`Delete ${food.name}`}
                          disabled={deleteMutation.isPending && deleteMutation.variables === food.slug}
                          onClick={() => deleteMutation.mutate(food.slug)}
                          size="icon"
                          type="button"
                          variant="destructive"
                        >
                          <Trash2 aria-hidden="true" size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="pagination-row">
            <div className="pagination-meta">
              <span>
                Page {page} of {pageCount}
              </span>
              <select
                aria-label="Foods per page"
                onChange={(event) => {
                  updateFoodSearch({ page_size: event.target.value });
                }}
                value={pageSize}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
            </div>
            <Pagination className="pagination-control">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    disabled={page <= 1 || isLoading}
                    onClick={() => updateFoodSearch({ page: Math.max(1, page - 1) }, false)}
                    type="button"
                  />
                </PaginationItem>
                {getPaginationItems(page, pageCount).map((item) => (
                  <PaginationItem key={item}>
                    {typeof item === "number" ? (
                      <PaginationButton
                        aria-label={`Go to page ${item}`}
                        disabled={isLoading}
                        isActive={item === page}
                        onClick={() => updateFoodSearch({ page: item }, false)}
                        type="button"
                      >
                        {item}
                      </PaginationButton>
                    ) : (
                      <PaginationEllipsis />
                    )}
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    disabled={page >= pageCount || isLoading}
                    onClick={() => updateFoodSearch({ page: Math.min(pageCount, page + 1) }, false)}
                    type="button"
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export function FoodFormPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { slug } = useParams();
  const [formError, setFormError] = useState<string | null>(null);
  const editingSlug = slug ?? null;
  const isEditing = Boolean(editingSlug);
  const onDone = () => navigate("/foods");

  const { data: nutrients = [] } = useQuery({
    queryKey: ["nutrients"],
    queryFn: () => fetchNutrients(),
  });

  const { data: editingFood, isLoading: isFoodLoading } = useQuery({
    queryKey: ["food", editingSlug],
    queryFn: () => fetchFood(editingSlug ?? ""),
    enabled: isEditing,
  });

  const form = useForm<FoodFormValues>({
    resolver: zodResolver(foodSchema),
    defaultValues,
  });

  const nutrientFields = useFieldArray({
    control: form.control,
    name: "nutrient_items",
  });

  useEffect(() => {
    if (!isEditing) {
      form.reset(defaultValues);
    }
  }, [form, isEditing]);

  useEffect(() => {
    if (!editingFood) {
      return;
    }

    form.reset({
      name: editingFood.name,
      category_slug: slugify(editingFood.category),
      description: editingFood.description,
      scientific_name: editingFood.scientific_name,
      source: editingFood.source,
      serving_size_g: editingFood.serving_size_g || "100",
      image_url: editingFood.image_url,
      is_active: editingFood.is_active,
      nutrient_items:
        editingFood.nutrients.length > 0
          ? editingFood.nutrients.map((nutrient) => ({
              nutrient_slug: nutrient.slug,
              amount: nutrient.amount,
              per_quantity: nutrient.per_quantity || "100",
              per_unit: nutrient.per_unit || "g",
            }))
          : [{ nutrient_slug: "", amount: "", per_quantity: "100", per_unit: "g" }],
    });
  }, [editingFood, form]);

  const saveMutation = useMutation({
    mutationFn: (values: FoodPayload) => (editingSlug ? updateFood(editingSlug, values) : createFood(values)),
    onError: () => setFormError("Unable to save this food."),
    onSuccess: async () => {
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["foods"] });
      onDone();
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    saveMutation.mutate({
      name: values.name.trim(),
      category_slug: slugify(values.category_slug),
      description: values.description?.trim() ?? "",
      scientific_name: values.scientific_name?.trim() ?? "",
      source: values.source?.trim() ?? "",
      serving_size_g: values.serving_size_g,
      image_url: values.image_url?.trim() ?? "",
      is_active: values.is_active,
      nutrient_items: values.nutrient_items
        .filter((item) => item.nutrient_slug && item.amount)
        .map((item) => {
          const selectedNutrient = nutrients.find((nutrient) => nutrient.slug === item.nutrient_slug);
          return {
            nutrient_slug: item.nutrient_slug ?? "",
            amount: item.amount ?? "",
            unit: selectedNutrient?.unit,
            per_quantity: item.per_quantity || "100",
            per_unit: item.per_unit || "g",
          };
        }),
    });
  });

  return (
    <section className="food-form-view" aria-labelledby="food-form-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Food Builder</p>
          <h1 id="food-form-title">{isEditing ? "Edit Food" : "Add Food"}</h1>
        </div>
        <Button onClick={onDone} type="button" variant="outline">
          <ChevronLeft aria-hidden="true" size={18} />
          Back to Foods
        </Button>
      </div>

      <form className="food-form-layout" onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>Name, categorization, source, and serving metadata.</CardDescription>
          </CardHeader>
          <CardContent className="resource-form">
            <Label>
              <span>Name</span>
              <Input disabled={isFoodLoading} type="text" {...form.register("name")} />
              {form.formState.errors.name ? <small>{form.formState.errors.name.message}</small> : null}
            </Label>

            <div className="form-grid-3">
              <Label>
                <span>Category Slug</span>
                <Input placeholder="fruits" type="text" {...form.register("category_slug")} />
                {form.formState.errors.category_slug ? <small>{form.formState.errors.category_slug.message}</small> : null}
              </Label>
              <Label>
                <span>Scientific Name</span>
                <Input type="text" {...form.register("scientific_name")} />
              </Label>
              <Label>
                <span>Serving Size (g)</span>
                <Input min="1" step="0.001" type="number" {...form.register("serving_size_g")} />
                {form.formState.errors.serving_size_g ? <small>{form.formState.errors.serving_size_g.message}</small> : null}
              </Label>
            </div>

            <div className="form-grid-2">
              <Label>
                <span>Source</span>
                <Input placeholder="Manual" type="text" {...form.register("source")} />
              </Label>
              <Label>
                <span>Image URL</span>
                <Input type="url" {...form.register("image_url")} />
                {form.formState.errors.image_url ? <small>{form.formState.errors.image_url.message}</small> : null}
              </Label>
            </div>

            <Label>
              <span>Description</span>
              <Textarea rows={5} {...form.register("description")} />
            </Label>

            <Label className="checkbox-row">
              <input type="checkbox" {...form.register("is_active")} />
              <span>Active</span>
            </Label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="food-list-header">
            <div>
              <CardTitle>Nutrient Profile</CardTitle>
              <CardDescription>These rows power content matching and association-rule scoring.</CardDescription>
            </div>
            <Button
              onClick={() => nutrientFields.append({ nutrient_slug: "", amount: "", per_quantity: "100", per_unit: "g" })}
              type="button"
              variant="secondary"
            >
              <Plus aria-hidden="true" size={16} />
              Add Nutrient
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3">
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
                <Label>
                  <span>Per Quantity</span>
                  <Input min="1" step="0.001" type="number" {...form.register(`nutrient_items.${index}.per_quantity`)} />
                </Label>
                <Label>
                  <span>Per Unit</span>
                  <Input type="text" {...form.register(`nutrient_items.${index}.per_unit`)} />
                </Label>
                <Button
                  aria-label={`Remove nutrient row ${index + 1}`}
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

            {formError ? <p className="form-error">{formError}</p> : null}

            <div className="form-actions">
              <Button disabled={saveMutation.isPending || isFoodLoading} type="submit">
                <Plus aria-hidden="true" size={18} />
                {saveMutation.isPending ? "Saving" : isEditing ? "Save Food" : "Create Food"}
              </Button>
              <Button onClick={onDone} type="button" variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </section>
  );
}
