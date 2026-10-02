const moneyFormatters = new Map<string, Intl.NumberFormat>();

// Digit grouping people expect for a currency, e.g. lakhs for INR: ₹24,00,000.
const GROUPING_LOCALE: Record<string, string> = { INR: "en-IN" };

/** Format in the currency's own conventions, no decimals (salaries are annual figures). */
export function formatMoney(amount: number | null | undefined, currency: string): string {
  if (amount === null || amount === undefined) return "—";
  let formatter = moneyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat(GROUPING_LOCALE[currency] ?? "en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
    moneyFormatters.set(currency, formatter);
  }
  return formatter.format(amount);
}

const usdCompact = new Intl.NumberFormat("en", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** "$701.9M" for headline numbers and chart axes. */
export function formatUsdCompact(amount: number | null | undefined): string {
  return amount === null || amount === undefined ? "—" : usdCompact.format(amount);
}

const integer = new Intl.NumberFormat("en");
export const formatCount = (n: number) => integer.format(n);

export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

/** ISO date "2024-06-01" -> "1 Jun 2024", without timezone shifts. */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
