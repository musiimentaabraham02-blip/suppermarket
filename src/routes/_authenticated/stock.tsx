import { createFileRoute } from "@tanstack/react-router";
import { CrudPage, money } from "@/components/CrudPage";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/stock")({
  component: () => (
    <CrudPage
      title="Stock"
      description="Manage inventory and reorder thresholds."
      table="stock"
      fields={[
        { name: "item_name", label: "Item", required: true },
        { name: "quantity", label: "Quantity", type: "number", required: true },
        { name: "buying_price", label: "Buying price", type: "number" },
        { name: "selling_price", label: "Selling price", type: "number" },
        { name: "supplier_name", label: "Supplier" },
        { name: "reorder_level", label: "Reorder level", type: "number", placeholder: "10" },
      ]}
      columns={[
        { key: "item_name", label: "Item" },
        { key: "quantity", label: "Qty", render: (v, row) => (
          v <= row.reorder_level
            ? <Badge variant="destructive">{v} (low)</Badge>
            : <span>{v}</span>
        )},
        { key: "buying_price", label: "Buy", render: money },
        { key: "selling_price", label: "Sell", render: money },
        { key: "supplier_name", label: "Supplier" },
      ]}
    />
  ),
  head: () => ({ meta: [{ title: "Stock — Twimu ERP" }] }),
});
