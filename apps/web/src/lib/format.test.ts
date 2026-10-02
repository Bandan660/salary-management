import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, formatPercent, formatUsdCompact } from "./format";

describe("formatMoney", () => {
  it("uses each currency's symbol without decimals", () => {
    expect(formatMoney(85000, "USD")).toBe("$85,000");
    // Indian digit grouping (lakhs), as HR in India reads salaries.
    expect(formatMoney(2400000, "INR")).toBe("₹24,00,000");
    expect(formatMoney(1234.56, "GBP")).toBe("£1,235");
  });

  it("shows a dash for missing values", () => {
    expect(formatMoney(null, "USD")).toBe("—");
  });
});

describe("formatUsdCompact", () => {
  it("abbreviates large numbers for headlines", () => {
    expect(formatUsdCompact(701_881_587)).toBe("$701.9M");
    expect(formatUsdCompact(66_200)).toBe("$66.2K");
  });
});

describe("formatPercent", () => {
  it("signs positive changes and keeps one decimal", () => {
    expect(formatPercent(7.5)).toBe("+7.5%");
    expect(formatPercent(-10)).toBe("-10.0%");
    expect(formatPercent(null)).toBe("—");
  });
});

describe("formatDate", () => {
  it("formats a calendar date without shifting it across timezones", () => {
    expect(formatDate("2024-02-29")).toBe("29 Feb 2024");
    expect(formatDate("2026-01-01")).toBe("1 Jan 2026");
  });
});
