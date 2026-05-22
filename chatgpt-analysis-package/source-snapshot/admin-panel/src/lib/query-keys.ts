import type { QueryClient } from "@tanstack/react-query";

export const queryKeys = {
  dashboard: ["admin-dashboard"] as const,
  foods: ["foods"] as const,
  nutrients: ["nutrients"] as const,
  supplements: ["supplements"] as const,
  rules: ["association-rules"] as const,
  users: ["admin-users"] as const,
};

export async function invalidateDashboard(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
}
