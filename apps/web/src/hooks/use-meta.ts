"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Meta } from "@/lib/types";

/** Reference data (countries, departments, levels). Static, so fetch once per session. */
export function useMeta() {
  const query = useQuery({
    queryKey: ["meta"],
    queryFn: () => api<Meta>("/meta"),
    staleTime: Infinity,
  });

  const countryName = (code: string) => query.data?.countries.find((c) => c.code === code)?.name ?? code;
  const currencyFor = (code: string) => query.data?.countries.find((c) => c.code === code)?.currency;
  /** Titles in one department, or every title (sorted) when no department is chosen. */
  const jobTitlesFor = (department?: string) => {
    const departments = query.data?.departments ?? [];
    const scoped = department ? departments.filter((d) => d.name === department) : departments;
    return scoped.flatMap((d) => d.jobTitles).sort();
  };

  return { ...query, countryName, currencyFor, jobTitlesFor };
}
