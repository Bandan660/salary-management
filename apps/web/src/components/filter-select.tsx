"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Radix Select can't use "" as an item value, so "all" stands for "no filter".
const ALL = "__all__";

interface FilterSelectProps {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
  /** false for a required choice (e.g. "Group by") that has no "All" option. */
  includeAll?: boolean;
  className?: string;
}

/**
 * A dropdown filter. The selected value is always shown with its label
 * ("Country: India") so a row of filters is readable at a glance.
 */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel = "All",
  includeAll = true,
  className,
}: FilterSelectProps) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
      <SelectTrigger aria-label={label} className={className ?? "w-48"}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value={ALL}>
            {label}: {allLabel}
          </SelectItem>
        )}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {label}: {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
