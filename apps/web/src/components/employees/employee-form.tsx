"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch, type Path } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMeta } from "@/hooks/use-meta";
import { ApiError } from "@/lib/api";
import type { Employee } from "@/lib/types";

// Client-side checks mirror the API's for instant feedback; the API stays the source of truth.
const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Required").max(100),
  lastName: z.string().trim().min(1, "Required").max(100),
  email: z.email("Enter a valid email"),
  country: z.string().min(1, "Required"),
  department: z.string().min(1, "Required"),
  jobTitle: z.string().min(1, "Required"),
  level: z.string().min(1, "Required"),
  hireDate: z.iso.date("Required"),
});

const createSchema = profileSchema.extend({
  salaryAmount: z
    .string()
    .trim()
    .refine((v) => Number(v) > 0, "Enter a positive amount")
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Use a plain number, up to 2 decimals"),
});

export type EmployeeFormValues = z.infer<typeof createSchema>;

interface EmployeeFormProps {
  mode: "create" | "edit";
  employee?: Employee;
  submitLabel: string;
  onSubmit: (values: EmployeeFormValues) => Promise<void>;
  onCancel: () => void;
}

export function EmployeeForm({ mode, employee, submitLabel, onSubmit, onCancel }: EmployeeFormProps) {
  const meta = useMeta();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(mode === "create" ? createSchema : profileSchema.extend({ salaryAmount: z.string() })),
    defaultValues: {
      firstName: employee?.firstName ?? "",
      lastName: employee?.lastName ?? "",
      email: employee?.email ?? "",
      country: employee?.country ?? "",
      department: employee?.department ?? "",
      jobTitle: employee?.jobTitle ?? "",
      level: employee?.level ?? "",
      hireDate: employee?.hireDate ?? "",
      salaryAmount: "",
    },
  });
  const { register, control, setValue, setError, formState } = form;
  const { errors, isSubmitting } = formState;

  const [department, country] = useWatch({ control, name: ["department", "country"] });
  const currency = meta.currencyFor(country);
  const jobTitles = meta.data?.departments.find((d) => d.name === department)?.jobTitles ?? [];

  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setFormError("Something went wrong. Please try again.");
        return;
      }
      // Put API validation messages next to the field they belong to.
      const fieldErrors = Object.entries(err.fieldErrors);
      for (const [field, message] of fieldErrors) {
        const name = (field === "salary.amount" ? "salaryAmount" : field) as Path<EmployeeFormValues>;
        setError(name, { message });
      }
      if (fieldErrors.length === 0) setFormError(err.message);
    }
  });

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="First name" error={errors.firstName?.message} htmlFor="firstName">
          <Input id="firstName" {...register("firstName")} />
        </Field>
        <Field label="Last name" error={errors.lastName?.message} htmlFor="lastName">
          <Input id="lastName" {...register("lastName")} />
        </Field>
      </div>

      <Field label="Work email" error={errors.email?.message} htmlFor="email">
        <Input id="email" type="email" {...register("email")} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Country" error={errors.country?.message}>
          <Controller
            control={control}
            name="country"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-label="Country" className="w-full">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {meta.data?.countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name} ({c.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Hire date" error={errors.hireDate?.message} htmlFor="hireDate">
          <Input id="hireDate" type="date" {...register("hireDate")} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Department" error={errors.department?.message}>
          <Controller
            control={control}
            name="department"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  // Job titles belong to a department: clear a title that no longer fits.
                  setValue("jobTitle", "");
                }}
              >
                <SelectTrigger aria-label="Department" className="w-full">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {meta.data?.departments.map((d) => (
                    <SelectItem key={d.name} value={d.name}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Level" error={errors.level?.message}>
          <Controller
            control={control}
            name="level"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-label="Level" className="w-full">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {meta.data?.levels.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      <Field label="Job title" error={errors.jobTitle?.message}>
        <Controller
          control={control}
          name="jobTitle"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={!department}>
              <SelectTrigger aria-label="Job title" className="w-full">
                <SelectValue placeholder={department ? "Select job title" : "Choose a department first"} />
              </SelectTrigger>
              <SelectContent>
                {jobTitles.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      {mode === "create" && (
        <Field
          label={`Starting annual salary${currency ? ` (${currency})` : ""}`}
          error={errors.salaryAmount?.message}
          htmlFor="salaryAmount"
          hint="Paid in the country's currency, effective from the hire date."
        >
          <Input id="salaryAmount" inputMode="decimal" placeholder="e.g. 85000" {...register("salaryAmount")} />
        </Field>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
