import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: number | string;
  helper?: string;
};

export function StatCard({ helper, icon: Icon, label, value }: StatCardProps) {
  return (
    <Card className="min-h-[112px]">
      <CardContent className="grid h-full gap-3 p-4">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand">
          <Icon aria-hidden="true" size={19} />
        </span>
        <div>
          <p className="m-0 text-sm font-bold text-slate-500">{label}</p>
          <strong className="text-2xl font-black text-slate-950">{value}</strong>
          {helper ? <p className="m-0 mt-1 text-xs font-semibold text-slate-500">{helper}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
