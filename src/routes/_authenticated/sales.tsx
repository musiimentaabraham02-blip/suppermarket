import { createFileRoute } from "@tanstack/react-router";
import { CrudPage, money } from "@/components/CrudPage";

export const Route = createFileRoute("/_authenticated/sales")({
  component: () => (
    <CrudPage
      title="Sales"
      description="Record and review branch sales."
      table="sales"
      attachManager
      fields={[
        { name: "amount", label: "Amount (UGX)", type: "number", required: true, placeholder: "10000" },
        { name: "description", label: "Description", placeholder: "Counter 1 — afternoon" },
      ]}
      columns={[
        { key: "amount", label: "Amount", render: money },
        { key: "description", label: "Description" },
      ]}
    />
  ),
  head: () => ({ meta: [{ title: "Sales — Twimu ERP" }] }),
});
