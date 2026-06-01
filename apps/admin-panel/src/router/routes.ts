import {
  Activity,
  Apple,
  Database,
  LayoutDashboard,
  MessageSquare,
  Network,
  BarChart3,
  Plus,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminRouteId = "dashboard" | "foods" | "food-form" | "knowledge" | "rules" | "rule-dataset" | "recommendations" | "evaluation" | "feedback" | "chats" | "users";

export const adminRoutes = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { id: "foods", label: "Foods", icon: Apple, path: "/foods" },
  { id: "food-form", label: "Add Food", icon: Plus, path: "/foods/new" },
  { id: "knowledge", label: "Knowledge Base", icon: Database, path: "/knowledge" },
  { id: "rules", label: "Rules", icon: ShieldCheck, path: "/rules" },
  { id: "rule-dataset", label: "Rule Dataset", icon: Network, path: "/rules/dataset" },
  { id: "recommendations", label: "Recommendations", icon: Activity, path: "/recommendations" },
  { id: "evaluation", label: "Evaluation", icon: BarChart3, path: "/evaluation" },
  { id: "feedback", label: "Feedback", icon: MessageSquare, path: "/feedback" },
  { id: "chats", label: "Chats", icon: MessageSquare, path: "/chats" },
  { id: "users", label: "Users", icon: Users, path: "/users" },
] as const satisfies ReadonlyArray<{ id: AdminRouteId; label: string; icon: LucideIcon; path: string }>;
