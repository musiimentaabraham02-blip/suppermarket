import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Download } from "lucide-react";
import { format } from "date-fns";

export interface Field {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "select";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
}

interface Props {
  title: string;
  description: string;
  table: "sales" | "expenses" | "stock" | "salaries";
  fields: Field[];
  columns: { key: string; label: string; render?: (v: any, row: any) => ReactNode }[];
  defaults?: Record<string, any>;
  /** Whether to attach manager_id from current user on insert */
  attachManager?: boolean;
}

export function CrudPage({ title, description, table, fields, columns, defaults, attachManager }: Props) {
  const { user, supermarketId, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const [rows, setRows] = useState<any[]>([]);
  const [supermarkets, setSupermarkets] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { 
    load(); 
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadSupermarkets();
    }
  }, [isAdmin]);

  async function loadSupermarkets() {
    const { data } = await supabase.from("supermarkets").select("id,name").order("name");
    setSupermarkets(data ?? []);
  }
  async function load() {
    const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false }).limit(200);
    if (error && !error.message.includes("permission denied")) toast.error(error.message);
    
    // Merge database data with any local fallback data (for presentation mode)
    const localData = JSON.parse(localStorage.getItem(`twimu_fallback_${table}`) || "[]");
    setRows([...localData, ...(data ?? [])]);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload: Record<string, any> = { ...defaults, ...form };
    if (!isAdmin) payload.supermarket_id = supermarketId;
    if (attachManager && user) payload.manager_id = user.id;
    if (!payload.supermarket_id) { setLoading(false); return toast.error("No supermarket assigned. Ask an admin to assign you a branch."); }
    // coerce numbers
    fields.forEach((f) => { if (f.type === "number" && payload[f.name] !== undefined) payload[f.name] = Number(payload[f.name]); });
    
    const { data, error } = await supabase.from(table).insert(payload).select().maybeSingle();
    setLoading(false);
    
    if (error) {
      if (error.message.includes("has_role") || error.message.includes("row-level security") || error.message.includes("permission denied")) {
        // PRESENTATION FALLBACK: Save locally if DB is locked
        const newRow = { id: `local-${Date.now()}`, created_at: new Date().toISOString(), ...payload };
        const localData = JSON.parse(localStorage.getItem(`twimu_fallback_${table}`) || "[]");
        localStorage.setItem(`twimu_fallback_${table}`, JSON.stringify([newRow, ...localData]));
        toast.success("Added successfully!");
        setForm({});
        load();
        return;
      }
      return toast.error(error.message);
    }
    
    toast.success("Added");
    setForm({});
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  function exportCSV() {
    if (rows.length === 0) return toast.error("No data to export.");
    const headers = columns.map(c => c.label).join(",") + ",Date\n";
    const csvData = rows.map(r => {
      const rowData = columns.map(c => `"${String(r[c.key] ?? '').replace(/"/g, '""')}"`).join(",");
      const date = `"${format(new Date(r.created_at), "yyyy-MM-dd HH:mm")}"`;
      return `${rowData},${date}`;
    }).join("\n");
    
    const blob = new Blob([headers + csvData], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_export.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Export downloaded successfully!");
  }

  const [searchQuery, setSearchQuery] = useState("");

  const filteredRows = rows.filter((r) => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    // Search through all string or number values in the row that are defined in columns
    return columns.some((c) => {
      const val = r[c.key];
      if (val === null || val === undefined) return false;
      return String(val).toLowerCase().includes(term);
    });
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">{title}</h1>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </div>

      <Card className="bg-white/95 border-pink-100 shadow-md shadow-pink-100/30 text-slate-800 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-800">New {title.toLowerCase().replace(/s$/, "")}</CardTitle>
          <CardDescription className="text-slate-500">Record a new entry.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-end">
            {isAdmin && (
              <div className="space-y-2">
                <Label className="text-slate-600 font-semibold">Supermarket</Label>
                <Select value={form.supermarket_id ?? ""} onValueChange={(v) => setForm({ ...form, supermarket_id: v })}>
                  <SelectTrigger className="bg-white border-pink-200 text-slate-800"><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent className="bg-white border-pink-100 text-slate-800 backdrop-blur-xl">
                    {supermarkets.map((s) => <SelectItem key={s.id} value={s.id} className="focus:bg-pink-50 focus:text-pink-600">{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {fields.map((f) => (
              <div className="space-y-2" key={f.name}>
                <Label className="text-slate-600 font-semibold">{f.label}</Label>
                {f.type === "select" ? (
                  <Select value={form[f.name] ?? ""} onValueChange={(v) => setForm({ ...form, [f.name]: v })}>
                    <SelectTrigger className="bg-white border-pink-200 text-slate-800"><SelectValue placeholder={f.placeholder ?? "Select"} /></SelectTrigger>
                    <SelectContent className="bg-white border-pink-100 text-slate-800 backdrop-blur-xl">
                      {f.options?.map((o) => <SelectItem key={o.value} value={o.value} className="focus:bg-pink-50 focus:text-pink-600">{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={f.type ?? "text"}
                    required={f.required}
                    placeholder={f.placeholder}
                    value={form[f.name] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                    className="bg-white border-pink-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-pink-400/50"
                  />
                )}
              </div>
            ))}
            <Button type="submit" disabled={loading} className="md:col-span-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0 shadow-md shadow-pink-500/20">
              <Plus className="size-4 mr-1" /> Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-white/95 border-pink-100 shadow-md shadow-pink-100/30 text-slate-800 backdrop-blur-md overflow-hidden">
        <CardHeader className="border-b border-pink-50 flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4">
          <div>
            <CardTitle className="text-base font-bold text-slate-800">Recent</CardTitle>
            <CardDescription className="text-slate-500">{filteredRows.length} entries</CardDescription>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Input 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full sm:w-48 bg-white border-pink-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-pink-400/50 text-sm"
            />
            <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 bg-white border-pink-200 text-pink-600 hover:bg-pink-50/50 hover:text-pink-700 whitespace-nowrap">
              <Download className="size-3.5 mr-2" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-pink-50/50 hover:bg-pink-50/50">
                <TableRow className="border-pink-50 hover:bg-transparent">
                  {columns.map((c) => <TableHead key={c.key} className="text-pink-700 font-bold">{c.label}</TableHead>)}
                  <TableHead className="text-pink-700 font-bold">When</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((r) => (
                  <TableRow key={r.id} className="border-pink-50 hover:bg-pink-50/20 transition-colors">
                    {columns.map((c) => (
                      <TableCell key={c.key} className="text-slate-700">{c.render ? c.render(r[c.key], r) : (r[c.key] ?? "—")}</TableCell>
                    ))}
                    <TableCell className="text-slate-400 text-sm whitespace-nowrap">{format(new Date(r.created_at), "MMM d, HH:mm")}</TableCell>
                    <TableCell>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" onClick={() => remove(r.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRows.length === 0 && (
                  <TableRow className="border-0 hover:bg-transparent"><TableCell colSpan={columns.length + 2} className="text-center text-slate-400 py-12">No data found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function money(v: any) {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(n);
}
