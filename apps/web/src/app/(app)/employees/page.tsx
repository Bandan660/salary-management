import type { Metadata } from "next";
import { Suspense } from "react";
import { EmployeeDirectory } from "@/components/employees/employee-directory";

export const metadata: Metadata = { title: "Employees" };

export default function EmployeesPage() {
  // The directory reads its state from the URL (useSearchParams), which needs a Suspense boundary.
  return (
    <Suspense>
      <EmployeeDirectory />
    </Suspense>
  );
}
