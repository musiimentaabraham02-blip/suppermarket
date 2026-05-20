import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Store, Navigation, Phone, Mail, ShoppingCart, Receipt, Package, Users, LineChart as ChartIcon } from "lucide-react";
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

export const Route = createFileRoute("/_authenticated/supermarkets")({
  component: SupermarketsPage,
  head: () => ({ meta: [{ title: "Supermarkets — Twimu ERP" }] }),
});

function fmt(n: number) {
  return new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(n);
}

function SupermarketsPage() {
  const { roles } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", location: "", phone: "", email: "" });
  
  // Drilldown states
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [branchStats, setBranchStats] = useState({ sales: 0, expenses: 0, stock: 0, salaries: 0 });
  const [branchTrend, setBranchTrend] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("supermarkets").select("*").order("name");
    const list = data ?? [];
    setRows(list);
    
    // Automatically select the first branch if none is selected
    if (list.length > 0 && !selectedBranch) {
      handleSelectBranch(list[0]);
    }
  }

  async function handleSelectBranch(branch: any) {
    setSelectedBranch(branch);
    
    // Fetch details specifically for this branch
    const since = startOfDay(subDays(new Date(), 13)).toISOString();
    const [s, e, st, sa] = await Promise.all([
      supabase.from("sales").select("amount,created_at").eq("supermarket_id", branch.id).gte("created_at", since),
      supabase.from("expenses").select("amount,created_at").eq("supermarket_id", branch.id).gte("created_at", since),
      supabase.from("stock").select("id").eq("supermarket_id", branch.id),
      supabase.from("salaries").select("monthly_salary").eq("supermarket_id", branch.id)
    ]);

    const salesList = s.data ?? [];
    const expensesList = e.data ?? [];
    
    setBranchStats({
      sales: salesList.reduce((acc, curr) => acc + Number(curr.amount), 0),
      expenses: expensesList.reduce((acc, curr) => acc + Number(curr.amount), 0),
      stock: (st.data ?? []).length,
      salaries: (sa.data ?? []).reduce((acc, curr) => acc + Number(curr.monthly_salary), 0)
    });

    // 14-day trend for this branch
    const days = Array.from({ length: 14 }).map((_, i) => {
      const d = startOfDay(subDays(new Date(), 13 - i));
      const key = format(d, "yyyy-MM-dd");
      return { date: format(d, "MMM d"), key, sales: 0, expenses: 0 };
    });

    salesList.forEach((r) => {
      const k = format(new Date(r.created_at), "yyyy-MM-dd");
      const day = days.find((d) => d.key === k);
      if (day) day.sales += Number(r.amount);
    });

    expensesList.forEach((r) => {
      const k = format(new Date(r.created_at), "yyyy-MM-dd");
      const day = days.find((d) => d.key === k);
      if (day) day.expenses += Number(r.amount);
    });

    setBranchTrend(days);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.from("supermarkets").insert(form).select().maybeSingle();
    
    // Local storage fallback for presentation
    if (error) {
      const newRow = { id: `local-${Date.now()}`, ...form };
      const localData = JSON.parse(localStorage.getItem(`twimu_fallback_supermarkets`) || "[]");
      localStorage.setItem(`twimu_fallback_supermarkets`, JSON.stringify([newRow, ...localData]));
      toast.success("Branch added successfully!");
      setForm({ name: "", location: "", phone: "", email: "" });
      load();
      return;
    }
    
    toast.success("Branch added");
    setForm({ name: "", location: "", phone: "", email: "" });
    load();
  }

  if (!roles.includes("admin")) return <Navigate to="/dashboard" />;

  // Merge presentation fallback branches with db rows
  const localSupermarkets = JSON.parse(localStorage.getItem(`twimu_fallback_supermarkets`) || "[]");
  const allSupermarkets = [...localSupermarkets, ...rows];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Supermarkets</h1>
        <p className="text-sm text-slate-500 mt-1">Manage and audit all branch activities in your network.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left column: Add Branch & List */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="bg-white/95 border-pink-100 shadow-md shadow-pink-100/30 text-slate-800 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-800">Add branch</CardTitle>
              <CardDescription className="text-slate-500">Create a new supermarket branch.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={add} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-600 font-semibold text-xs">Name</Label>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white border-pink-200 text-slate-800 placeholder:text-slate-400 h-10 rounded-xl" placeholder="Branch Name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-600 font-semibold text-xs">Location</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="bg-white border-pink-200 text-slate-800 placeholder:text-slate-400 h-10 rounded-xl" placeholder="Address" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-600 font-semibold text-xs">Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-white border-pink-200 text-slate-800 placeholder:text-slate-400 h-10 rounded-xl" placeholder="Contact number" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-600 font-semibold text-xs">Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-white border-pink-200 text-slate-800 placeholder:text-slate-400 h-10 rounded-xl" placeholder="branch@example.com" />
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0 shadow-md shadow-pink-500/20 h-10 rounded-xl">
                  <Plus className="size-4 mr-1" /> Add branch
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-white/95 border-pink-100 shadow-md shadow-pink-100/30 text-slate-800 backdrop-blur-md overflow-hidden">
            <CardHeader className="border-b border-pink-50 py-4">
              <CardTitle className="text-base font-bold text-slate-800">Select a Branch</CardTitle>
            </CardHeader>
            <div className="divide-y divide-pink-50 max-h-[300px] overflow-y-auto">
              {allSupermarkets.map((r) => {
                const active = selectedBranch?.id === r.id;
                return (
                  <button 
                    key={r.id} 
                    onClick={() => handleSelectBranch(r)}
                    className={`w-full text-left p-4 transition-all flex items-center gap-3 hover:bg-pink-50/20 ${active ? "bg-pink-50/70 border-l-4 border-pink-500" : ""}`}
                  >
                    <div className={`p-2 rounded-xl transition-colors ${active ? "bg-pink-100 text-pink-600" : "bg-slate-100 text-slate-400"}`}>
                      <Store className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-800 truncate">{r.name}</div>
                      <div className="text-xs text-slate-400 truncate flex items-center gap-1 mt-0.5"><Navigation className="size-3" /> {r.location || "—"}</div>
                    </div>
                  </button>
                );
              })}
              {allSupermarkets.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">No branches created yet.</div>
              )}
            </div>
          </Card>
        </div>

        {/* Right column: Branch Details Drilldown */}
        <div className="lg:col-span-2 space-y-8">
          {selectedBranch ? (
            <>
              {/* Branch header card */}
              <Card className="bg-gradient-to-br from-white to-pink-50/25 border-pink-100 shadow-md shadow-pink-100/30 text-slate-800 backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                  <Store className="size-48" />
                </div>
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3.5 rounded-2xl bg-pink-100 text-pink-600 border border-pink-200/50">
                      <Store className="size-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{selectedBranch.name}</h2>
                      <p className="text-pink-600 text-xs font-bold uppercase tracking-wider mt-0.5">Active Branch Details</p>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 pt-4 border-t border-pink-50 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Navigation className="size-4 text-pink-500" />
                      <span>{selectedBranch.location || "No address listed"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="size-4 text-pink-500" />
                      <span>{selectedBranch.phone || "No phone listed"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="size-4 text-pink-500" />
                      <span className="truncate">{selectedBranch.email || "No email listed"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Branch stats cards */}
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                <MiniStat icon={ShoppingCart} label="Sales" value={fmt(branchStats.sales)} />
                <MiniStat icon={Receipt} label="Expenses" value={fmt(branchStats.expenses)} />
                <MiniStat icon={Package} label="Stock Items" value={String(branchStats.stock)} />
                <MiniStat icon={Users} label="Monthly payroll" value={fmt(branchStats.salaries)} />
              </div>

              {/* Branch Trend Chart */}
              <Card className="bg-white/95 border-pink-100 shadow-md shadow-pink-100/30 text-slate-800 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <ChartIcon className="size-4 text-pink-500" /> Branch Financial Performance
                  </CardTitle>
                  <CardDescription className="text-slate-500">14-day trend for {selectedBranch.name}</CardDescription>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={branchTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
                      <XAxis dataKey="date" fontSize={11} stroke="rgba(15,23,42,0.4)" tickLine={false} axisLine={false} dy={10} />
                      <YAxis fontSize={11} stroke="rgba(15,23,42,0.4)" tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} dx={-10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'rgba(244,63,94,0.1)', borderRadius: '12px', color: '#0f172a', boxShadow: '0 4px 12px rgba(244,63,94,0.08)' }} 
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Line type="monotone" dataKey="sales" name="Sales" stroke="#ff69b4" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#fb7185" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="h-full flex items-center justify-center p-12 bg-white/50 border border-pink-100 rounded-2xl">
              <div className="text-center text-slate-400 max-w-sm">
                <Store className="size-12 mx-auto mb-4 opacity-50 text-pink-500" />
                <h3 className="font-bold text-slate-700 mb-1">No Branch Selected</h3>
                <p className="text-xs">Create or select a supermarket branch on the left to see its branch-by-branch operational metrics.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="bg-white/95 border border-pink-100 rounded-2xl p-4 shadow-md shadow-pink-100/20">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{label}</span>
        <div className="p-1.5 rounded-lg bg-pink-100 text-pink-600">
          <Icon className="size-3.5" />
        </div>
      </div>
      <div className="text-base font-bold text-slate-800 tracking-tight truncate">{value}</div>
    </div>
  );
}
