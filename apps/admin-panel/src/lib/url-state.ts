export function getPositiveIntegerParam(value: string | null, fallback = 1) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function updateUrlSearchParams(currentParams: URLSearchParams, updates: Record<string, string | number | null | undefined>) {
  const next = new URLSearchParams(currentParams);
  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  });
  return next;
}
