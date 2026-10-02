"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, TrendingUp, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMeta } from "@/hooks/use-meta";
import { api } from "@/lib/api";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import type { EmployeeDetail as EmployeeDetailData } from "@/lib/types";
import { EmployeeForm, type EmployeeFormValues } from "./employee-form";
import { PeerComparison } from "./peer-comparison";
import { SalaryChangeForm, type SalaryChangeValues } from "./salary-change-form";

type OpenDialog = "edit" | "salary" | "status" | null;

export function EmployeeDetail({ id }: { id: string }) {
  const meta = useMeta();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<OpenDialog>(null);

  const employee = useQuery({
    queryKey: ["employee", id],
    queryFn: () => api<EmployeeDetailData>(`/employees/${id}`),
  });

  /** Every mutation returns the fresh employee; store it and refresh lists/insights that may have changed. */
  function onUpdated(updated: EmployeeDetailData, message: string) {
    queryClient.setQueryData(["employee", id], updated);
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    queryClient.invalidateQueries({ queryKey: ["insights"] });
    setDialog(null);
    toast.success(message);
  }

  const update = useMutation({
    // Salary is never edited in place (it has its own history), so only profile fields are sent.
    mutationFn: ({ firstName, lastName, email, country, department, jobTitle, level, hireDate }: EmployeeFormValues) =>
      api<EmployeeDetailData>(`/employees/${id}`, {
        method: "PATCH",
        json: { firstName, lastName, email, country, department, jobTitle, level, hireDate },
      }),
    onSuccess: (e) => onUpdated(e, "Profile updated"),
  });

  const addSalary = useMutation({
    mutationFn: (values: SalaryChangeValues) =>
      api<EmployeeDetailData>(`/employees/${id}/salaries`, { method: "POST", json: values }),
    onSuccess: (e) => onUpdated(e, "Salary change recorded"),
  });

  const setStatus = useMutation({
    mutationFn: (action: "deactivate" | "reactivate") =>
      api<EmployeeDetailData>(`/employees/${id}/${action}`, { method: "POST" }),
    onSuccess: (e) => onUpdated(e, e.status === "ACTIVE" ? "Employee reactivated" : "Employee deactivated"),
    onError: (err) => toast.error(err.message),
  });

  if (employee.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Couldn&apos;t load this employee: {employee.error.message}</AlertDescription>
      </Alert>
    );
  }
  if (!employee.data) return <Skeleton className="h-96 w-full" />;

  const e = employee.data;
  const active = e.status === "ACTIVE";
  const currency = meta.currencyFor(e.country) ?? e.currentSalary?.currency ?? "USD";
  const today = new Date().toLocaleDateString("en-CA");

  return (
    <div className="grid gap-6">
      <Link href="/employees" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Employees
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {e.firstName} {e.lastName}
            </h1>
            <Badge variant={active ? "outline" : "secondary"}>{active ? "Active" : "Inactive"}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{e.employeeCode}</span> · {e.jobTitle} · {e.level} · {e.department}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setDialog("edit")}>
            <Pencil /> Edit
          </Button>
          <Button variant="outline" onClick={() => setDialog("status")}>
            {active ? <UserX /> : <UserCheck />} {active ? "Deactivate" : "Reactivate"}
          </Button>
          {active && (
            <Button onClick={() => setDialog("salary")}>
              <TrendingUp /> Record salary change
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Current salary</CardTitle>
            <CardDescription>
              {e.currentSalary ? `Effective ${formatDate(e.currentSalary.effectiveDate)}` : "No salary in effect yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {e.currentSalary && (
              <>
                <p className="text-3xl font-semibold tracking-tight tabular-nums">
                  {formatMoney(e.currentSalary.amount, e.currentSalary.currency)}
                </p>
                {e.currentSalary.currency !== "USD" && (
                  <p className="text-sm text-muted-foreground">
                    ≈ {formatMoney(e.currentSalary.amountUsd, "USD")} per year
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {active ? (
          <PeerComparison employee={e} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Compared with peers</CardTitle>
              <CardDescription>Not shown for inactive employees.</CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="truncate">{e.email}</dd>
              <dt className="text-muted-foreground">Country</dt>
              <dd>{meta.countryName(e.country)}</dd>
              <dt className="text-muted-foreground">Hired</dt>
              <dd>{formatDate(e.hireDate)}</dd>
              <dt className="text-muted-foreground">Paid in</dt>
              <dd>{currency}</dd>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Salary history</CardTitle>
          <CardDescription>Every change is kept. Newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Effective</TableHead>
                <TableHead className="text-right">Annual salary</TableHead>
                <TableHead className="text-right">USD equivalent</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="tabular-nums">
              {e.salaryHistory.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(s.effectiveDate)}
                    {s.effectiveDate > today && (
                      <Badge variant="secondary" className="ml-2">
                        Scheduled
                      </Badge>
                    )}
                    {s.id === e.currentSalary?.id && (
                      <Badge variant="outline" className="ml-2">
                        Current
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(s.amount, s.currency)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatMoney(s.amountUsd, "USD")}</TableCell>
                  <TableCell className="text-right">{formatPercent(s.changePercent)}</TableCell>
                  <TableCell className="text-muted-foreground">{s.reason ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialog === "edit"} onOpenChange={(open) => setDialog(open ? "edit" : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit employee</DialogTitle>
            <DialogDescription>Salary changes are recorded separately so history is kept.</DialogDescription>
          </DialogHeader>
          <EmployeeForm
            mode="edit"
            employee={e}
            submitLabel="Save changes"
            onSubmit={async (values) => {
              await update.mutateAsync(values);
            }}
            onCancel={() => setDialog(null)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "salary"} onOpenChange={(open) => setDialog(open ? "salary" : null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record salary change</DialogTitle>
            <DialogDescription>
              For {e.firstName} {e.lastName}. Paid in {currency}.
            </DialogDescription>
          </DialogHeader>
          <SalaryChangeForm
            currency={currency}
            currentSalary={e.currentSalary}
            onSubmit={async (values) => {
              await addSalary.mutateAsync(values);
            }}
            onCancel={() => setDialog(null)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "status"} onOpenChange={(open) => setDialog(open ? "status" : null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{active ? "Deactivate" : "Reactivate"} {e.firstName} {e.lastName}?</DialogTitle>
            <DialogDescription>
              {active
                ? "They'll be hidden from the directory and excluded from pay insights. Their salary history is kept and they can be reactivated later."
                : "They'll appear in the directory and pay insights again."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={active ? "destructive" : "default"}
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate(active ? "deactivate" : "reactivate")}
            >
              {active ? "Deactivate" : "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
