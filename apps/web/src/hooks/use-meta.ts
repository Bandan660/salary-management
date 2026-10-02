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

  return { ...query, countryName, currencyFor };
}
