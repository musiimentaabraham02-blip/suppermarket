import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/audit")({
  component: AuditPage,
  head: () => ({ meta: [{ title: "Audit log — Twimu ERP" }] }),
});

function AuditPage() {
  const { roles } = useAuth();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setRows(data ?? []));
  }, []);

  if (!roles.includes("admin")) return <Navigate to="/dashboard" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted-foreground">Recent system activity.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Recent events</CardTitle><CardDescription>Last 100 entries</CardDescription></CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>When</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>Details</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(r.created_at), "MMM d, HH:mm")}</TableCell>
                  <TableCell className="font-medium">{r.action}</TableCell>
                  <TableCell>{r.entity ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.details ? JSON.stringify(r.details) : "—"}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No audit entries yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
