import {
  Activity,
  Apple,
  Database,
  LayoutDashboard,
  MessageSquare,
  Plus,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminRouteId = "dashboard" | "foods" | "food-form" | "knowledge" | "rules" | "recommendations" | "feedback" | "users";

export const adminRoutes = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { id: "foods", label: "Foods", icon: Apple, path: "/foods" },
  { id: "food-form", label: "Add Food", icon: Plus, path: "/foods/new" },
  { id: "knowledge", label: "Knowledge Base", icon: Database, path: "/knowledge" },
  { id: "rules", label: "Rules", icon: ShieldCheck, path: "/rules" },
  { id: "recommendations", label: "Recommendations", icon: Activity, path: "/recommendations" },
  { id: "feedback", label: "Feedback", icon: MessageSquare, path: "/feedback" },
  { id: "users", label: "Users", icon: Users, path: "/users" },
] as const satisfies ReadonlyArray<{ id: AdminRouteId; label: string; icon: LucideIcon; path: string }>;
