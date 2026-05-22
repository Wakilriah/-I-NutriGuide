import { Skeleton } from "@/components/ui/skeleton";

type TableSkeletonProps = {
  columns?: number;
  rows?: number;
};

export function MetricSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="metric-grid compact-metric-grid" aria-label="Loading statistics">
      {Array.from({ length: count }).map((_, index) => (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={index}>
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="mt-4 h-4 w-24" />
          <Skeleton className="mt-3 h-7 w-16" />
          <Skeleton className="mt-2 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ columns = 4, rows = 5 }: TableSkeletonProps) {
  return (
    <div className="admin-table-wrap" aria-label="Loading table">
      <table className="admin-table">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index}>
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, columnIndex) => (
                <td key={columnIndex}>
                  <Skeleton className="h-4 w-full max-w-[180px]" />
                  {columnIndex === 0 ? <Skeleton className="mt-2 h-3 w-24" /> : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="chart-frame" aria-label="Loading chart">
      <Skeleton className="h-[220px] w-full rounded-lg" />
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-3" aria-label="Loading list">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="rounded-lg border border-slate-200 bg-white p-4" key={index}>
          <div className="flex items-start justify-between gap-4">
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
          <Skeleton className="mt-4 h-20 w-full" />
        </div>
      ))}
    </div>
  );
}
