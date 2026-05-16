import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AdminLayout } from "../components/AdminLayout";
import { LoginPage } from "../features/auth/LoginPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { FeedbackPage } from "../features/feedback/FeedbackPage";
import { FoodFormPage, FoodsPage } from "../features/knowledge/FoodsPage";
import { KnowledgeBasePage } from "../features/knowledge/KnowledgeBasePage";
import { RecommendationDetailPage, RecommendationsPage } from "../features/recommendations/RecommendationsPage";
import { RulesPage } from "../features/rules/RulesPage";
import { UserDetailPage, UsersPage } from "../features/users/UsersPage";
import { queryClient } from "../lib/query-client";
import { useAuthStore } from "../store/auth-store";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function AppRoutes() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const location = useLocation();

  return (
    <Routes>
      <Route path="/login" element={accessToken ? <Navigate replace to="/" /> : <LoginPage />} />
      <Route
        element={accessToken ? <AdminLayout /> : <Navigate replace state={{ from: location }} to="/login" />}
        path="/"
      >
        <Route index element={<DashboardPage />} />
        <Route path="foods" element={<FoodsPage />} />
        <Route path="foods/new" element={<FoodFormPage />} />
        <Route path="foods/:slug/edit" element={<FoodFormPage />} />
        <Route path="knowledge" element={<KnowledgeBasePage />} />
        <Route path="rules" element={<RulesPage />} />
        <Route path="recommendations" element={<RecommendationsPage />} />
        <Route path="recommendations/:runId" element={<RecommendationDetailPage />} />
        <Route path="feedback" element={<FeedbackPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:userId" element={<UserDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate replace to={accessToken ? "/" : "/login"} />} />
    </Routes>
  );
}
