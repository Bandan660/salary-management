"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { formatMoney, formatPercent } from "@/lib/format";
import type { Salary } from "@/lib/types";

const schema = z.object({
  amount: z
    .string()
    .trim()
    .refine((v) => Number(v) > 0, "Enter a positive amount")
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Use a plain number, up to 2 decimals"),
  effectiveDate: z.iso.date("Pick a date"),
  reason: z.string().trim().max(200).optional(),
});
export type SalaryChangeValues = z.infer<typeof schema>;

// The HR user's local calendar date ("en-CA" formats as YYYY-MM-DD).
const todayIso = () => new Date().toLocaleDateString("en-CA");

interface SalaryChangeFormProps {
  currency: string;
  currentSalary: Salary | null;
  onSubmit: (values: SalaryChangeValues) => Promise<void>;
  onCancel: () => void;
}

export function SalaryChangeForm({ currency, currentSalary, onSubmit, onCancel }: SalaryChangeFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, control, formState } = useForm<SalaryChangeValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: "", effectiveDate: todayIso(), reason: "" },
  });
  const { errors, isSubmitting } = formState;

  // Live preview of the change so HR sees "+8.0%" before saving, not after.
  const newAmount = Number(useWatch({ control, name: "amount" }));
  const change =
    currentSalary && currentSalary.currency === currency && newAmount > 0
      ? ((newAmount - currentSalary.amount) / currentSalary.amount) * 100
      : null;

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit({ ...values, reason: values.reason || undefined });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  });

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      {currentSalary && (
        <p className="text-sm text-muted-foreground">
          Current: <span className="font-medium text-foreground">{formatMoney(currentSalary.amount, currentSalary.currency)}</span>
        </p>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="amount">New annual salary ({currency})</Label>
        <Input id="amount" inputMode="decimal" autoFocus {...register("amount")} />
        {errors.amount ? (
          <p className="text-xs text-destructive">{errors.amount.message}</p>
        ) : (
          change !== null && (
            <p className="text-xs text-muted-foreground">
              {formatPercent(Math.round(change * 10) / 10)} vs current salary
            </p>
          )
        )}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="effectiveDate">Effective date</Label>
        <Input id="effectiveDate" type="date" {...register("effectiveDate")} />
        {errors.effectiveDate ? (
          <p className="text-xs text-destructive">{errors.effectiveDate.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">A future date schedules the change; history is never overwritten.</p>
        )}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="reason">Reason (optional)</Label>
        <Input id="reason" placeholder="e.g. Annual review, Promotion" {...register("reason")} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Record change"}
        </Button>
      </div>
    </form>
  );
}
