import { createFileRoute } from "@tanstack/react-router";
import { CrudPage, money } from "@/components/CrudPage";

export const Route = createFileRoute("/_authenticated/expenses")({
  component: () => (
    <CrudPage
      title="Expenses"
      description="Track operating expenses."
      table="expenses"
      attachManager
      fields={[
        { name: "category", label: "Category", placeholder: "Utilities" },
        { name: "amount", label: "Amount (UGX)", type: "number", required: true },
        { name: "description", label: "Description" },
      ]}
      columns={[
        { key: "category", label: "Category" },
        { key: "amount", label: "Amount", render: money },
        { key: "description", label: "Description" },
      ]}
    />
  ),
  head: () => ({ meta: [{ title: "Expenses — Twimu ERP" }] }),
});
