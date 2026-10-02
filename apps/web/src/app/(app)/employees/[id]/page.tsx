import type { Metadata } from "next";
import { EmployeeDetail } from "@/components/employees/employee-detail";

export const metadata: Metadata = { title: "Employee" };

export default async function EmployeePage({ params }: PageProps<"/employees/[id]">) {
  const { id } = await params;
  return <EmployeeDetail id={id} />;
}
