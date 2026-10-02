import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatTileProps {
  label: string;
  value: string | undefined;
  caption?: string;
}

/** One headline number. These answer the top questions without needing a chart. */
export function StatTile({ label, value, caption }: StatTileProps) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        {value === undefined ? (
          <Skeleton className="mt-2 h-8 w-28" />
        ) : (
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
        )}
        {caption && <p className="mt-1 text-xs text-muted-foreground">{caption}</p>}
      </CardContent>
    </Card>
  );
}
