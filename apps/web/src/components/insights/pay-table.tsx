import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCount, formatMoney } from "@/lib/format";
import type { PayChartRow } from "./pay-chart";

const usd = (n: number | null) => formatMoney(n, "USD");

/** The full numbers behind the chart; also the accessible, non-visual view of it. */
export function PayTable({ rows, groupLabel }: { rows: PayChartRow[]; groupLabel: string }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{groupLabel}</TableHead>
            <TableHead className="text-right">Headcount</TableHead>
            <TableHead className="text-right">Min</TableHead>
            <TableHead className="text-right">P25</TableHead>
            <TableHead className="text-right">Median</TableHead>
            <TableHead className="text-right">P75</TableHead>
            <TableHead className="text-right">Max</TableHead>
            <TableHead className="text-right">Average</TableHead>
            <TableHead className="text-right">Total payroll</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="tabular-nums">
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell className="text-right">{formatCount(row.headcount)}</TableCell>
              <TableCell className="text-right">{usd(row.minUsd)}</TableCell>
              <TableCell className="text-right">{usd(row.p25Usd)}</TableCell>
              <TableCell className="text-right font-medium">{usd(row.medianUsd)}</TableCell>
              <TableCell className="text-right">{usd(row.p75Usd)}</TableCell>
              <TableCell className="text-right">{usd(row.maxUsd)}</TableCell>
              <TableCell className="text-right">{usd(row.averageUsd)}</TableCell>
              <TableCell className="text-right">{usd(row.totalUsd)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
