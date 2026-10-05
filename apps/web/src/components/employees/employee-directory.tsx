"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FilterSelect } from "@/components/filter-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useMeta } from "@/hooks/use-meta";
import { api, toQueryString } from "@/lib/api";
import { formatCount, formatDate, formatMoney } from "@/lib/format";
import type { Employee, EmployeeDetail, Paginated } from "@/lib/types";
import { EmployeeForm, type EmployeeFormValues } from "./employee-form";

const PAGE_SIZE = 25;
const FILTER_KEYS = ["search", "country", "department", "jobTitle", "level", "status"] as const;

type SortField = "name" | "employeeCode" | "hireDate" | "country" | "department" | "level";

/** All directory state lives in the URL: refresh, back button and shared links keep the view. */
function useDirectoryParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const get = (key: string) => searchParams.get(key) ?? undefined;
  const params = {
    search: get("search"),
    country: get("country"),
    department: get("department"),
    jobTitle: get("jobTitle"),
    level: get("level"),
    status: get("status") ?? "ACTIVE",
    sortBy: (get("sortBy") ?? "name") as SortField,
    sortDir: (get("sortDir") ?? "asc") as "asc" | "desc",
    page: Number(get("page") ?? 1),
  };

  function update(changes: Record<string, string | number | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, String(value));
    }
    // Any filter change invalidates the current page number.
    if (Object.keys(changes).some((k) => (FILTER_KEYS as readonly string[]).includes(k))) next.delete("page");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return { params, update };
}

export function EmployeeDirectory() {
  const meta = useMeta();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { params, update } = useDirectoryParams();
  const [searchInput, setSearchInput] = useState(params.search ?? "");
  const debouncedSearch = useDebouncedValue(searchInput);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if ((params.search ?? "") !== debouncedSearch) update({ search: debouncedSearch || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced input
  }, [debouncedSearch]);

  const employees = useQuery({
    queryKey: ["employees", params],
    queryFn: () =>
      api<Paginated<Employee>>(`/employees${toQueryString({ ...params, pageSize: PAGE_SIZE })}`),
    placeholderData: keepPreviousData,
  });

  const createEmployee = useMutation({
    mutationFn: (values: EmployeeFormValues) => {
      const { salaryAmount, ...profile } = values;
      return api<EmployeeDetail>("/employees", { method: "POST", json: { ...profile, salary: { amount: salaryAmount } } });
    },
    onSuccess: (employee) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      toast.success(`${employee.firstName} ${employee.lastName} added as ${employee.employeeCode}`);
      router.push(`/employees/${employee.id}`);
    },
  });

  function toggleSort(field: SortField) {
    const sortDir = params.sortBy === field && params.sortDir === "asc" ? "desc" : "asc";
    update({ sortBy: field, sortDir });
  }

  const data = employees.data;
  const hasFilters = FILTER_KEYS.some((k) => k !== "status" && params[k]) || params.status !== "ACTIVE";

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${formatCount(data.total)} ${params.status === "ALL" ? "" : params.status.toLowerCase() + " "}employees` : " "}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus /> Add employee
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, email or code"
            aria-label="Search employees"
            className="pl-8"
          />
        </div>
        <FilterSelect
          label="Country"
          value={params.country}
          onChange={(country) => update({ country })}
          options={meta.data?.countries.map((c) => ({ value: c.code, label: c.name })) ?? []}
        />
        <FilterSelect
          label="Department"
          value={params.department}
          onChange={(department) =>
            update({
              department,
              // Keep the title filter only if it still belongs to the chosen department.
              jobTitle: params.jobTitle && meta.jobTitlesFor(department).includes(params.jobTitle) ? params.jobTitle : undefined,
            })
          }
          options={meta.data?.departments.map((d) => ({ value: d.name, label: d.name })) ?? []}
        />
        <FilterSelect
          label="Job title"
          value={params.jobTitle}
          onChange={(jobTitle) => update({ jobTitle })}
          options={meta.jobTitlesFor(params.department).map((t) => ({ value: t, label: t }))}
          className="w-60"
        />
        <FilterSelect
          label="Level"
          value={params.level}
          onChange={(level) => update({ level })}
          options={meta.data?.levels.map((l) => ({ value: l, label: l })) ?? []}
          className="w-32"
        />
        <FilterSelect
          label="Status"
          value={params.status}
          onChange={(status) => update({ status: status ?? "ACTIVE" })}
          options={[
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
            { value: "ALL", label: "All" },
          ]}
          includeAll={false}
          className="w-40"
        />
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearchInput("");
              update(Object.fromEntries(FILTER_KEYS.map((key) => [key, undefined])));
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {employees.error && (
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load employees: {employees.error.message}</AlertDescription>
        </Alert>
      )}

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead field="employeeCode" label="Code" params={params} onSort={toggleSort} />
              <SortableHead field="name" label="Name" params={params} onSort={toggleSort} />
              <SortableHead field="level" label="Role" params={params} onSort={toggleSort} />
              <SortableHead field="department" label="Department" params={params} onSort={toggleSort} />
              <SortableHead field="country" label="Country" params={params} onSort={toggleSort} />
              <SortableHead field="hireDate" label="Hired" params={params} onSort={toggleSort} />
              <TableHead className="text-right">Current salary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.isPending &&
              Array.from({ length: 8 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  No employees match these filters.
                </TableCell>
              </TableRow>
            )}
            {data?.data.map((e) => (
              <TableRow
                key={e.id}
                className="cursor-pointer"
                onClick={() => router.push(`/employees/${e.id}`)}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">{e.employeeCode}</TableCell>
                <TableCell>
                  <Link
                    href={`/employees/${e.id}`}
                    className="font-medium hover:underline"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {e.firstName} {e.lastName}
                  </Link>
                  {e.status === "INACTIVE" && (
                    <Badge variant="secondary" className="ml-2">
                      Inactive
                    </Badge>
                  )}
                  <div className="text-xs text-muted-foreground">{e.email}</div>
                </TableCell>
                <TableCell>
                  {e.jobTitle} <span className="text-muted-foreground">· {e.level}</span>
                </TableCell>
                <TableCell>{e.department}</TableCell>
                <TableCell>{meta.countryName(e.country)}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(e.hireDate)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {e.currentSalary ? (
                    <>
                      <div>{formatMoney(e.currentSalary.amount, e.currentSalary.currency)}</div>
                      {e.currentSalary.currency !== "USD" && (
                        <div className="text-xs text-muted-foreground">
                          ≈ {formatMoney(e.currentSalary.amountUsd, "USD")}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {formatCount((data.page - 1) * data.pageSize + 1)}–
            {formatCount(Math.min(data.page * data.pageSize, data.total))} of {formatCount(data.total)}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.page <= 1}
              onClick={() => update({ page: data.page - 1 })}
            >
              <ChevronLeft /> Previous
            </Button>
            <span>
              Page {data.page} of {formatCount(data.totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={data.page >= data.totalPages}
              onClick={() => update({ page: data.page + 1 })}
            >
              Next <ChevronRight />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add employee</DialogTitle>
            <DialogDescription>An employee code is assigned automatically.</DialogDescription>
          </DialogHeader>
          <EmployeeForm
            mode="create"
            submitLabel="Add employee"
            onSubmit={async (values) => {
              await createEmployee.mutateAsync(values);
            }}
            onCancel={() => setCreating(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableHead({
  field,
  label,
  params,
  onSort,
}: {
  field: SortField;
  label: string;
  params: { sortBy: SortField; sortDir: "asc" | "desc" };
  onSort: (field: SortField) => void;
}) {
  const active = params.sortBy === field;
  const Icon = params.sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead aria-sort={active ? (params.sortDir === "asc" ? "ascending" : "descending") : undefined}>
      <button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        {active && <Icon className="size-3.5" />}
      </button>
    </TableHead>
  );
}
