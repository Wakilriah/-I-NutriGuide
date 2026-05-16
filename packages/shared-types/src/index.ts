export interface HealthResponse {
  status: "ok" | "error";
  database: "ok" | "error";
  redis: "ok" | "error";
}

export interface RecommendationDisclaimer {
  disclaimer: string;
}

