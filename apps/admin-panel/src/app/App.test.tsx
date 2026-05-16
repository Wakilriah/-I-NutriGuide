import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { queryClient } from "../lib/query-client";
import { useAuthStore } from "../store/auth-store";

vi.mock("../api/dashboard", () => ({
  fetchDashboardMetrics: vi.fn(async () => ({
    total_users: 4,
    total_foods: 21,
    total_supplements: 10,
    total_recommendations: 7,
    average_feedback_rating: 4.5,
    total_saved_foods: 3,
    total_association_rules: 2,
    active_association_rules: 1,
    recommendation_items_with_rules: 1,
    average_rule_score: 0.7,
    most_used_supplements: [],
    most_recommended_foods: [],
    most_saved_foods: [{ recommendation_item__food__name: "Orange", recommendation_item__food__slug: "orange", count: 2 }],
    food_category_counts: [{ category__name: "Fruits", category__slug: "fruits", count: 10 }],
    food_source_counts: [{ source: "CIQUAL 2020", count: 10 }],
    rule_usage: [{ rule_id: 1, label: "supplement:iron -> nutrient:vitamin-c", count: 1 }],
  })),
}));

const authApi = vi.hoisted(() => ({
  loginAdmin: vi.fn(async () => ({
    access: "access-token",
    refresh: "refresh-token",
    user: { id: 1, email: "admin@example.com", name: "Admin User", is_staff: true },
  })),
}));

vi.mock("../api/auth", () => authApi);

const nutrientApi = vi.hoisted(() => ({
  createNutrient: vi.fn(async (payload) => ({
    id: 3,
    slug: "zinc",
    created_at: "2026-05-08T00:00:00Z",
    updated_at: "2026-05-08T00:00:00Z",
    ...payload,
  })),
  deleteNutrient: vi.fn(async () => undefined),
  fetchNutrients: vi.fn(async () => [
    {
      id: 1,
      name: "Magnesium",
      slug: "magnesium",
      unit: "mg",
      description: "Supports muscle and nerve function.",
      created_at: "2026-05-08T00:00:00Z",
      updated_at: "2026-05-08T00:00:00Z",
    },
    {
      id: 2,
      name: "Vitamin D",
      slug: "vitamin-d",
      unit: "IU",
      description: "Supports calcium absorption.",
      created_at: "2026-05-08T00:00:00Z",
      updated_at: "2026-05-08T00:00:00Z",
    },
  ]),
  fetchPaginatedNutrients: vi.fn(async (params: { search?: string } = {}) => {
    const nutrients = [
      {
        id: 1,
        name: "Magnesium",
        slug: "magnesium",
        unit: "mg",
        description: "Supports muscle and nerve function.",
        created_at: "2026-05-08T00:00:00Z",
        updated_at: "2026-05-08T00:00:00Z",
      },
      {
        id: 2,
        name: "Vitamin D",
        slug: "vitamin-d",
        unit: "IU",
        description: "Supports calcium absorption.",
        created_at: "2026-05-08T00:00:00Z",
        updated_at: "2026-05-08T00:00:00Z",
      },
    ];
    const search = String(params.search ?? "").toLowerCase();
    const results = search ? nutrients.filter((nutrient) => nutrient.name.toLowerCase().includes(search)) : nutrients;
    return { count: results.length, next: null, previous: null, results };
  }),
  updateNutrient: vi.fn(async (_slug, payload) => ({
    id: 1,
    slug: "magnesium",
    created_at: "2026-05-08T00:00:00Z",
    updated_at: "2026-05-08T00:00:00Z",
    ...payload,
  })),
}));

vi.mock("../api/nutrients", () => nutrientApi);

const foodApi = vi.hoisted(() => ({
  createFood: vi.fn(async (payload) => ({
    id: 3,
    slug: "spinach",
    category: "Vegetables",
    nutrients: [],
    created_at: "2026-05-08T00:00:00Z",
    updated_at: "2026-05-08T00:00:00Z",
    ...payload,
  })),
  deleteFood: vi.fn(async () => undefined),
  fetchFood: vi.fn(async (slug) => ({
    id: 1,
    name: slug === "spinach" ? "Spinach" : "Orange",
    slug,
    category: slug === "spinach" ? "Vegetables" : "Fruits",
    description: slug === "spinach" ? "Leafy green." : "Citrus fruit.",
    scientific_name: "",
    ciqual_code: slug === "orange" ? "10001" : null,
    source: slug === "orange" ? "CIQUAL 2020" : "",
    serving_size_g: "100.000",
    image_url: "",
    is_active: slug === "orange",
    nutrients: [],
    created_at: "2026-05-08T00:00:00Z",
    updated_at: "2026-05-08T00:00:00Z",
  })),
  fetchFoodCategories: vi.fn(async () => [
    { id: 1, name: "Fruits", slug: "fruits", ciqual_group_code: "", ciqual_subgroup_code: "", ciqual_subsubgroup_code: "", source: "" },
    { id: 2, name: "Vegetables", slug: "vegetables", ciqual_group_code: "", ciqual_subgroup_code: "", ciqual_subsubgroup_code: "", source: "" },
  ]),
  fetchFoods: vi.fn(async (params: { search?: string } = {}) => {
    const foods = [
      {
        id: 1,
        name: "Orange",
        slug: "orange",
        category: "Fruits",
        description: "Citrus fruit.",
        scientific_name: "",
        ciqual_code: "10001",
        source: "CIQUAL 2020",
        serving_size_g: "100.000",
        image_url: "",
        is_active: true,
        nutrients: [
          {
            name: "Vitamin D",
            slug: "vitamin-d",
            amount: "53.200",
            unit: "IU",
            per_quantity: "100.000",
            per_unit: "g",
          },
        ],
        created_at: "2026-05-08T00:00:00Z",
        updated_at: "2026-05-08T00:00:00Z",
      },
      {
        id: 2,
        name: "Spinach",
        slug: "spinach",
        category: "Vegetables",
        description: "Leafy green.",
        scientific_name: "",
        ciqual_code: null,
        source: "",
        serving_size_g: "100.000",
        image_url: "",
        is_active: false,
        nutrients: [],
        created_at: "2026-05-08T00:00:00Z",
        updated_at: "2026-05-08T00:00:00Z",
      },
    ];
    const search = String(params.search ?? "").toLowerCase();
    const results = search
      ? foods.filter((food) => [food.name, food.slug, food.category].some((value) => value.toLowerCase().includes(search)))
      : foods;
    return { count: results.length, next: null, previous: null, results };
  }),
  updateFood: vi.fn(async (_slug, payload) => ({
    id: 1,
    slug: "orange",
    category: "Fruits",
    nutrients: [],
    created_at: "2026-05-08T00:00:00Z",
    updated_at: "2026-05-08T00:00:00Z",
    ...payload,
  })),
}));

vi.mock("../api/foods", () => foodApi);

const supplementApi = vi.hoisted(() => ({
  createSupplement: vi.fn(async (payload) => ({
    id: 3,
    slug: "zinc",
    nutrients: [],
    created_at: "2026-05-08T00:00:00Z",
    updated_at: "2026-05-08T00:00:00Z",
    ...payload,
  })),
  deleteSupplement: vi.fn(async () => undefined),
  fetchSupplements: vi.fn(async () => [
    {
      id: 1,
      name: "Iron",
      slug: "iron",
      description: "Iron supplement.",
      common_dose: "18 mg daily",
      is_active: true,
      nutrients: [
        {
          name: "Magnesium",
          slug: "magnesium",
          amount: "18.000",
          unit: "mg",
        },
      ],
      created_at: "2026-05-08T00:00:00Z",
      updated_at: "2026-05-08T00:00:00Z",
    },
    {
      id: 2,
      name: "Archived Zinc",
      slug: "archived-zinc",
      description: "Archived.",
      common_dose: "",
      is_active: false,
      nutrients: [],
      created_at: "2026-05-08T00:00:00Z",
      updated_at: "2026-05-08T00:00:00Z",
    },
  ]),
  fetchPaginatedSupplements: vi.fn(async (params: { search?: string } = {}) => {
    const supplements = [
      {
        id: 1,
        name: "Iron",
        slug: "iron",
        description: "Iron supplement.",
        common_dose: "18 mg daily",
        is_active: true,
        nutrients: [
          {
            name: "Magnesium",
            slug: "magnesium",
            amount: "18.000",
            unit: "mg",
          },
        ],
        created_at: "2026-05-08T00:00:00Z",
        updated_at: "2026-05-08T00:00:00Z",
      },
      {
        id: 2,
        name: "Archived Zinc",
        slug: "archived-zinc",
        description: "Archived.",
        common_dose: "",
        is_active: false,
        nutrients: [],
        created_at: "2026-05-08T00:00:00Z",
        updated_at: "2026-05-08T00:00:00Z",
      },
    ];
    const search = String(params.search ?? "").toLowerCase();
    const results = search ? supplements.filter((supplement) => supplement.name.toLowerCase().includes(search)) : supplements;
    return { count: results.length, next: null, previous: null, results };
  }),
  updateSupplement: vi.fn(async (_slug, payload) => ({
    id: 1,
    slug: "iron",
    nutrients: [],
    created_at: "2026-05-08T00:00:00Z",
    updated_at: "2026-05-08T00:00:00Z",
    ...payload,
  })),
}));

vi.mock("../api/supplements", () => supplementApi);

const rulesApi = vi.hoisted(() => ({
  createAssociationRule: vi.fn(async (payload) => ({
    id: 2,
    created_at: "2026-05-08T00:00:00Z",
    updated_at: "2026-05-08T00:00:00Z",
    ...payload,
  })),
  deleteAssociationRule: vi.fn(async () => undefined),
  fetchAssociationRules: vi.fn(async () => [
    {
      id: 1,
      antecedent_type: "supplement",
      antecedent_slug: "iron",
      consequent_type: "nutrient",
      consequent_slug: "vitamin-c",
      support: 0.32,
      confidence: 0.84,
      lift: 1.45,
      explanation: "Vitamin C-rich foods may support iron absorption.",
      is_active: true,
      created_at: "2026-05-08T00:00:00Z",
      updated_at: "2026-05-08T00:00:00Z",
    },
  ]),
  fetchPaginatedAssociationRules: vi.fn(async (params: { search?: string } = {}) => {
    const rules = [
      {
        id: 1,
        antecedent_type: "supplement",
        antecedent_slug: "iron",
        consequent_type: "nutrient",
        consequent_slug: "vitamin-c",
        support: 0.32,
        confidence: 0.84,
        lift: 1.45,
        explanation: "Vitamin C-rich foods may support iron absorption.",
        is_active: true,
        created_at: "2026-05-08T00:00:00Z",
        updated_at: "2026-05-08T00:00:00Z",
      },
    ];
    const search = String(params.search ?? "").toLowerCase();
    const results = search
      ? rules.filter((rule) => [rule.antecedent_slug, rule.consequent_slug].some((value) => value.toLowerCase().includes(search)))
      : rules;
    return { count: results.length, next: null, previous: null, results };
  }),
  updateAssociationRule: vi.fn(async (_id, payload) => ({
    id: 1,
    created_at: "2026-05-08T00:00:00Z",
    updated_at: "2026-05-08T00:00:00Z",
    ...payload,
  })),
}));

vi.mock("../api/rules", () => rulesApi);

const recommendationsApi = vi.hoisted(() => ({
  fetchAdminRecommendationRuns: vi.fn(async () => [
    {
      run_id: "1f3a6e0a-1f1e-4f8a-b5ef-9044668aa000",
      user: { id: 1, email: "user@example.com", name: "Demo User" },
      created_at: "2026-05-08T17:30:00Z",
      disclaimer: "Educational nutrition guidance only.",
      items: [
        {
          id: 11,
          rank: 1,
          food: { id: 1, name: "Orange", slug: "orange", category: "Fruits" },
          matched_supplement: { id: 1, name: "Iron", slug: "iron" },
          score: 2.4,
          nutrient_score: 1.1,
          rule_score: 1.0,
          preference_score: 0.3,
          matched_nutrients: ["vitamin-c"],
          matched_rules: [{ id: 1, antecedent: "supplement:iron", consequent: "nutrient:vitamin-c" }],
          tags: ["absorption"],
          warnings: [],
          explanation: "Vitamin C-rich foods may support iron absorption.",
        },
      ],
    },
  ]),
  fetchPaginatedAdminRecommendationRuns: vi.fn(async () => ({
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        run_id: "1f3a6e0a-1f1e-4f8a-b5ef-9044668aa000",
        user: { id: 1, email: "user@example.com", name: "Demo User" },
        created_at: "2026-05-08T17:30:00Z",
        disclaimer: "Educational nutrition guidance only.",
        items: [
          {
            id: 11,
            rank: 1,
            food: { id: 1, name: "Orange", slug: "orange", category: "Fruits" },
            matched_supplement: { id: 1, name: "Iron", slug: "iron" },
            score: 2.4,
            nutrient_score: 1.1,
            rule_score: 1.0,
            preference_score: 0.3,
            matched_nutrients: ["vitamin-c"],
            matched_rules: [{ id: 1, antecedent: "supplement:iron", consequent: "nutrient:vitamin-c" }],
            tags: ["absorption"],
            warnings: [],
            explanation: "Vitamin C-rich foods may support iron absorption.",
          },
        ],
      },
    ],
  })),
  fetchAdminRecommendationRun: vi.fn(async () => ({
    run_id: "1f3a6e0a-1f1e-4f8a-b5ef-9044668aa000",
    user: { id: 1, email: "user@example.com", name: "Demo User" },
    created_at: "2026-05-08T17:30:00Z",
    disclaimer: "Educational nutrition guidance only.",
    items: [
      {
        id: 11,
        rank: 1,
        food: { id: 1, name: "Orange", slug: "orange", category: "Fruits" },
        matched_supplement: { id: 1, name: "Iron", slug: "iron" },
        score: 2.4,
        nutrient_score: 1.1,
        rule_score: 1.0,
        preference_score: 0.3,
        matched_nutrients: ["vitamin-c"],
        matched_rules: [{ id: 1, antecedent: "supplement:iron", consequent: "nutrient:vitamin-c" }],
        tags: ["absorption"],
        warnings: [],
        explanation: "Vitamin C-rich foods may support iron absorption.",
      },
    ],
  })),
}));

vi.mock("../api/recommendations", () => recommendationsApi);

const feedbackApi = vi.hoisted(() => ({
  fetchFeedback: vi.fn(async () => [
    {
      id: 1,
      recommendation_item: {
        id: 11,
        rank: 1,
        run_id: "1f3a6e0a-1f1e-4f8a-b5ef-9044668aa000",
        food: { id: 1, name: "Orange", slug: "orange" },
      },
      user_email: "user@example.com",
      rating: 5,
      is_helpful: true,
      comment: "Useful recommendation.",
      created_at: "2026-05-08T17:35:00Z",
    },
  ]),
  fetchPaginatedFeedback: vi.fn(async () => ({
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: 1,
        recommendation_item: {
          id: 11,
          rank: 1,
          run_id: "1f3a6e0a-1f1e-4f8a-b5ef-9044668aa000",
          food: { id: 1, name: "Orange", slug: "orange" },
        },
        user_email: "user@example.com",
        rating: 5,
        is_helpful: true,
        comment: "Useful recommendation.",
        created_at: "2026-05-08T17:35:00Z",
      },
    ],
  })),
}));

vi.mock("../api/feedback", () => feedbackApi);

const usersApi = vi.hoisted(() => ({
  createAdminUser: vi.fn(async (payload) => ({
    id: 3,
    date_joined: "2026-05-08T14:00:00Z",
    profile: null,
    supplement_count: 0,
    recommendation_count: 0,
    feedback_count: 0,
    ...payload,
  })),
  deleteAdminUser: vi.fn(async () => undefined),
  fetchAdminUsers: vi.fn(async () => [
    {
      id: 1,
      email: "riahwakil@gmail.com",
      name: "Riah Wakil",
      is_staff: true,
      is_active: true,
      date_joined: "2026-05-08T12:00:00Z",
      profile: {
        age: null,
        country: "",
        gender: "",
        bmi: null,
        sports_days_per_week: null,
        goal: "general_health",
        goals: [],
        health_conditions: [],
        activity_level: "",
        diet_type: "none",
        allergies: [],
        dietary_restrictions: [],
        disliked_foods: [],
      },
      supplement_count: 1,
      recommendation_count: 1,
      feedback_count: 1,
    },
    {
      id: 2,
      email: "user@example.com",
      name: "Demo User",
      is_staff: false,
      is_active: true,
      date_joined: "2026-05-08T13:00:00Z",
      profile: null,
      supplement_count: 0,
      recommendation_count: 0,
      feedback_count: 0,
    },
  ]),
  fetchPaginatedAdminUsers: vi.fn(async (params: { search?: string } = {}) => {
    const users = [
      {
        id: 1,
        email: "riahwakil@gmail.com",
        name: "Riah Wakil",
        is_staff: true,
        is_active: true,
        date_joined: "2026-05-08T12:00:00Z",
        profile: {
          age: null,
          country: "",
          gender: "",
          bmi: null,
          sports_days_per_week: null,
          goal: "general_health",
          goals: [],
          health_conditions: [],
          activity_level: "",
          diet_type: "none",
          allergies: [],
          dietary_restrictions: [],
          disliked_foods: [],
        },
        supplement_count: 1,
        recommendation_count: 1,
        feedback_count: 1,
      },
      {
        id: 2,
        email: "user@example.com",
        name: "Demo User",
        is_staff: false,
        is_active: true,
        date_joined: "2026-05-08T13:00:00Z",
        profile: null,
        supplement_count: 0,
        recommendation_count: 0,
        feedback_count: 0,
      },
    ];
    const search = String(params.search ?? "").toLowerCase();
    const results = search ? users.filter((user) => [user.email, user.name].some((value) => value.toLowerCase().includes(search))) : users;
    return { count: results.length, next: null, previous: null, results };
  }),
  fetchAdminUser: vi.fn(async () => ({
    id: 2,
    email: "user@example.com",
    name: "Demo User",
    is_staff: false,
    is_active: true,
    date_joined: "2026-05-08T13:00:00Z",
    profile: null,
    supplement_count: 0,
    recommendation_count: 0,
    feedback_count: 0,
    supplements: [],
    recent_recommendations: [],
    recent_feedback: [],
  })),
  updateAdminUser: vi.fn(async (_id, payload) => ({
    id: 1,
    email: "riahwakil@gmail.com",
    name: "Riah Wakil",
    is_staff: true,
    is_active: true,
    date_joined: "2026-05-08T12:00:00Z",
    profile: null,
    supplement_count: 1,
    recommendation_count: 1,
    feedback_count: 1,
    ...payload,
  })),
}));

vi.mock("../api/users", () => usersApi);

const adminSession = {
  access: "access-token",
  refresh: "refresh-token",
  user: { id: 1, email: "admin@example.com", name: "Admin User", is_staff: true },
};

afterEach(() => {
  cleanup();
  useAuthStore.getState().logout();
  queryClient.clear();
  window.localStorage.clear();
  window.history.pushState(null, "", "/");
  vi.clearAllMocks();
});

describe("App", () => {
  it("renders the login page when no admin session exists", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /operations workspace/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("toggles admin password visibility", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /show password/i }));

    expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument();
  });

  it("validates admin login fields when they lose focus", async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "not-an-email" } });
    fireEvent.blur(screen.getByLabelText(/^email$/i));
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "short" } });
    fireEvent.blur(screen.getByLabelText(/^password$/i));

    expect(await screen.findByText("Enter a valid email.")).toBeInTheDocument();
    expect(await screen.findByText("Password must be at least 8 characters.")).toBeInTheDocument();
  });

  it("shows a friendly message when admin login credentials fail", async () => {
    authApi.loginAdmin.mockRejectedValueOnce(new Error("No active account found with the given credentials"));

    render(<App />);

    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "chochito@gmail.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "StrongPassword123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Please verify your email and password and try again.")).toBeInTheDocument();
    expect(screen.queryByText(/No active account/i)).not.toBeInTheDocument();
  });

  it("renders the admin dashboard for an authenticated admin", async () => {
    useAuthStore.getState().setSession(adminSession);

    render(<App />);

    expect(screen.getAllByRole("heading", { name: /dashboard/i })[0]).toBeInTheDocument();
    expect(await screen.findByText(/recommendation runs/i)).toBeInTheDocument();
    expect(screen.getAllByText(/saved foods/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/admin navigation/i)).toBeInTheDocument();
  });

  it("switches between admin sections", () => {
    useAuthStore.getState().setSession(adminSession);

    render(<App />);
    fireEvent.click(screen.getByRole("link", { name: /rules/i }));

    expect(screen.getByRole("heading", { name: /association rules/i })).toBeInTheDocument();
    expect(screen.getByText(/rule library/i)).toBeInTheDocument();
  });

  it("renders and filters nutrients in the knowledge base", async () => {
    useAuthStore.getState().setSession(adminSession);

    render(<App />);
    fireEvent.click(screen.getByRole("link", { name: /knowledge base/i }));

    expect(await screen.findByText("Magnesium")).toBeInTheDocument();
    expect(await screen.findByText("Vitamin D")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/search nutrients/i), { target: { value: "vitamin" } });

    await waitFor(() => expect(screen.queryByText("Magnesium")).not.toBeInTheDocument());
    expect(await screen.findByText("Vitamin D")).toBeInTheDocument();
  });

  it("creates nutrients from the knowledge base form", async () => {
    useAuthStore.getState().setSession(adminSession);

    render(<App />);
    fireEvent.click(screen.getByRole("link", { name: /knowledge base/i }));
    await screen.findByText("Magnesium");
    fireEvent.click(screen.getByRole("button", { name: /add nutrient/i }));

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "Zinc" } });
    fireEvent.change(screen.getByLabelText(/^unit$/i), { target: { value: "mg" } });
    fireEvent.change(screen.getByLabelText(/^description$/i), { target: { value: "Supports immune function." } });
    fireEvent.click(screen.getByRole("button", { name: /create nutrient/i }));

    await waitFor(() => {
      expect(nutrientApi.createNutrient).toHaveBeenCalledWith({
        name: "Zinc",
        unit: "mg",
        description: "Supports immune function.",
      });
    });
  });

  it("renders and filters foods in the knowledge base", async () => {
    useAuthStore.getState().setSession(adminSession);

    render(<App />);
    fireEvent.click(screen.getByRole("link", { name: /^foods$/i }));

    expect(await screen.findByText("Orange")).toBeInTheDocument();
    expect(screen.getByText("Spinach")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/search foods/i), { target: { value: "orange" } });

    await waitFor(() => expect(screen.getByText("Orange")).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText("Spinach")).not.toBeInTheDocument());
  });

  it("creates foods from the dedicated food form page", async () => {
    useAuthStore.getState().setSession(adminSession);

    render(<App />);
    fireEvent.click(screen.getByRole("link", { name: /add food/i }));
    await screen.findByRole("heading", { name: /add food/i });
    await screen.findByText("Vitamin D (IU)");

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "Blueberries" } });
    fireEvent.change(screen.getByLabelText(/category slug/i), { target: { value: "fruits" } });
    fireEvent.change(screen.getByLabelText(/^description$/i), { target: { value: "Small berries." } });
    fireEvent.change(screen.getByLabelText(/^nutrient$/i), { target: { value: "vitamin-d" } });
    fireEvent.change(screen.getByLabelText(/nutrient amount/i), { target: { value: "10.5" } });
    fireEvent.click(screen.getByRole("button", { name: /create food/i }));

    await waitFor(() => {
      expect(foodApi.createFood).toHaveBeenCalledWith({
        name: "Blueberries",
        category_slug: "fruits",
        description: "Small berries.",
        scientific_name: "",
        source: "",
        serving_size_g: "100",
        image_url: "",
        is_active: true,
        nutrient_items: [
          {
            nutrient_slug: "vitamin-d",
            amount: "10.5",
            unit: "IU",
            per_quantity: "100",
            per_unit: "g",
          },
        ],
      });
    });
  });

  it("renders and filters supplements in the knowledge base", async () => {
    useAuthStore.getState().setSession(adminSession);

    render(<App />);
    fireEvent.click(screen.getByRole("link", { name: /knowledge base/i }));
    fireEvent.click(await screen.findByRole("tab", { name: "Supplements" }));

    expect(await screen.findByText("Iron")).toBeInTheDocument();
    expect(await screen.findByText("Archived Zinc")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/search supplements/i), { target: { value: "zinc" } });

    await waitFor(() => expect(screen.queryByText("Iron")).not.toBeInTheDocument());
    expect(await screen.findByText("Archived Zinc")).toBeInTheDocument();
  });

  it("creates supplements from the knowledge base form", async () => {
    useAuthStore.getState().setSession(adminSession);

    render(<App />);
    fireEvent.click(screen.getByRole("link", { name: /knowledge base/i }));
    fireEvent.click(await screen.findByRole("tab", { name: "Supplements" }));
    await screen.findByText("Iron");
    fireEvent.click(screen.getByRole("button", { name: /add supplement/i }));

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "Zinc" } });
    fireEvent.change(screen.getByLabelText(/common dose/i), { target: { value: "15 mg daily" } });
    fireEvent.change(screen.getByLabelText(/^description$/i), { target: { value: "Zinc supplement." } });
    fireEvent.change(screen.getByLabelText(/^nutrient$/i), { target: { value: "magnesium" } });
    fireEvent.change(screen.getByLabelText(/nutrient amount/i), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: /create supplement/i }));

    await waitFor(() => {
      expect(supplementApi.createSupplement).toHaveBeenCalledWith({
        name: "Zinc",
        description: "Zinc supplement.",
        common_dose: "15 mg daily",
        is_active: true,
        nutrient_items: [
          {
            nutrient_slug: "magnesium",
            amount: "15",
            unit: "mg",
          },
        ],
      });
    });
  });

  it("renders and filters association rules", async () => {
    useAuthStore.getState().setSession(adminSession);

    render(<App />);
    fireEvent.click(screen.getByRole("link", { name: /rules/i }));

    expect((await screen.findAllByText(/iron/)).length).toBeGreaterThan(0);
    expect(screen.getByText(/vitamin-c/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/search rules/i), { target: { value: "vitamin" } });

    await waitFor(() => {
      expect(screen.getByText(/vitamin-c/)).toBeInTheDocument();
    });
  });

  it("creates association rules", async () => {
    useAuthStore.getState().setSession(adminSession);

    render(<App />);
    fireEvent.click(screen.getByRole("link", { name: /rules/i }));
    await screen.findAllByText(/iron/);
    fireEvent.click(screen.getByRole("button", { name: /add rule/i }));

    fireEvent.change(screen.getByLabelText(/antecedent slug/i), { target: { value: "magnesium" } });
    fireEvent.change(screen.getByLabelText(/consequent slug/i), { target: { value: "leafy-greens" } });
    fireEvent.change(screen.getByLabelText(/^support$/i), { target: { value: "0.25" } });
    fireEvent.change(screen.getByLabelText(/^confidence$/i), { target: { value: "0.7" } });
    fireEvent.change(screen.getByLabelText(/^lift$/i), { target: { value: "1.2" } });
    fireEvent.change(screen.getByLabelText(/^explanation$/i), {
      target: { value: "Leafy greens can complement magnesium intake." },
    });
    fireEvent.click(screen.getByRole("button", { name: /create rule/i }));

    await waitFor(() => {
      expect(rulesApi.createAssociationRule).toHaveBeenCalledWith({
        antecedent_type: "supplement",
        antecedent_slug: "magnesium",
        consequent_type: "nutrient",
        consequent_slug: "leafy-greens",
        support: 0.25,
        confidence: 0.7,
        lift: 1.2,
        explanation: "Leafy greens can complement magnesium intake.",
        is_active: true,
      });
    });
  });

  it("renders and filters recommendation runs", async () => {
    useAuthStore.getState().setSession(adminSession);

    render(<App />);
    fireEvent.click(screen.getByRole("link", { name: /recommendations/i }));

    expect(await screen.findByText("Demo User")).toBeInTheDocument();
    expect(screen.getByText(/top match: orange/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/search recommendation runs/i), { target: { value: "orange" } });

    expect(await screen.findByText(/top match: orange/i)).toBeInTheDocument();
  });

  it("renders and filters feedback", async () => {
    useAuthStore.getState().setSession(adminSession);

    render(<App />);
    fireEvent.click(screen.getByRole("link", { name: /feedback/i }));

    expect(await screen.findByText("Useful recommendation.")).toBeInTheDocument();
    expect(screen.getByText("5/5")).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/search feedback/i), { target: { value: "orange" } });

    expect(await screen.findByText("Orange")).toBeInTheDocument();
  });

  it("renders and filters users", async () => {
    useAuthStore.getState().setSession(adminSession);

    render(<App />);
    fireEvent.click(screen.getByRole("link", { name: /users/i }));

    expect(await screen.findByText("Riah Wakil")).toBeInTheDocument();
    expect(screen.getByText("Demo User")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/search users/i), { target: { value: "riah" } });

    expect(await screen.findByText("Riah Wakil")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Demo User")).not.toBeInTheDocument());
  });

  it("logs out of the admin workspace", () => {
    useAuthStore.getState().setSession(adminSession);

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /log out/i }));

    expect(screen.getByRole("heading", { name: /operations workspace/i })).toBeInTheDocument();
  });
});
