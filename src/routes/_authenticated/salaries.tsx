import { createFileRoute } from "@tanstack/react-router";
import { CrudPage, money } from "@/components/CrudPage";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/salaries")({
  component: () => (
    <CrudPage
      title="Salaries"
      description="Employee payroll records."
      table="salaries"
      fields={[
        { name: "employee_name", label: "Employee", required: true },
        { name: "position", label: "Position" },
        { name: "monthly_salary", label: "Monthly salary (UGX)", type: "number", required: true },
        { name: "payment_status", label: "Status", type: "select", options: [
          { value: "pending", label: "Pending" },
          { value: "paid", label: "Paid" },
        ]},
        { name: "payment_date", label: "Payment date", type: "date" },
      ]}
      columns={[
        { key: "employee_name", label: "Employee" },
        { key: "position", label: "Position" },
        { key: "monthly_salary", label: "Salary", render: money },
        { key: "payment_status", label: "Status", render: (v) => (
          <Badge variant={v === "paid" ? "default" : "secondary"} className="capitalize">{v}</Badge>
        )},
        { key: "payment_date", label: "Date" },
      ]}
    />
  ),
  head: () => ({ meta: [{ title: "Salaries — Twimu ERP" }] }),
});
