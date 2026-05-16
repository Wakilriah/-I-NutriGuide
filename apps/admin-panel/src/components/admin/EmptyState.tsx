import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({ message }: { message: string }) {
  return (
    <Card className="border-dashed bg-slate-50">
      <CardContent className="p-4">
        <p className="m-0 text-sm font-semibold text-slate-500">{message}</p>
      </CardContent>
    </Card>
  );
}
