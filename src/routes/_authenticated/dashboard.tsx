import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShoppingCart, Receipt, Package, Users, AlertTriangle, TrendingUp, Store, ArrowRight, LogOut } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Twimu ERP" }] }),
});

interface Stats {
  sales: number; expenses: number; stockItems: number; lowStock: number; salaries: number; salesCount: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(n);
}

function Dashboard() {
  const { roles, supermarketId, fullName, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = roles.includes("admin");
  const [stats, setStats] = useState<Stats>({ sales: 0, expenses: 0, stockItems: 0, lowStock: 0, salaries: 0, salesCount: 0 });
  const [trend, setTrend] = useState<{ date: string; sales: number; expenses: number }[]>([]);
  const [byBranch, setByBranch] = useState<{ name: string; sales: number }[]>([]);
  const [anomalies, setAnomalies] = useState<{ id: string; amount: number; created_at: string }[]>([]);
  const [branchPanels, setBranchPanels] = useState<any[]>([]);

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supermarketId, isAdmin]);

  async function load() {
    const since = startOfDay(subDays(new Date(), 13)).toISOString();
    const [s, e, st, sa] = await Promise.all([
      supabase.from("sales").select("amount,created_at,supermarket_id").gte("created_at", since),
      supabase.from("expenses").select("amount,created_at").gte("created_at", since),
      supabase.from("stock").select("id,quantity,reorder_level"),
      supabase.from("salaries").select("monthly_salary,payment_status"),
    ]);

    const localSales = JSON.parse(localStorage.getItem("twimu_fallback_sales") || "[]");
    const localExpenses = JSON.parse(localStorage.getItem("twimu_fallback_expenses") || "[]");
    const localStock = JSON.parse(localStorage.getItem("twimu_fallback_stock") || "[]");
    const localSalaries = JSON.parse(localStorage.getItem("twimu_fallback_salaries") || "[]");

    const sales = [...localSales.filter((x: any) => x.created_at >= since), ...(s.data ?? [])];
    const expenses = [...localExpenses.filter((x: any) => x.created_at >= since), ...(e.data ?? [])];
    const stock = [...localStock, ...(st.data ?? [])];
    const salaries = [...localSalaries, ...(sa.data ?? [])];

    setStats({
      sales: sales.reduce((a, r) => a + Number(r.amount), 0),
      expenses: expenses.reduce((a, r) => a + Number(r.amount), 0),
      stockItems: stock.length,
      lowStock: stock.filter((r) => r.quantity <= r.reorder_level).length,
      salaries: salaries.reduce((a, r) => a + Number(r.monthly_salary), 0),
      salesCount: sales.length,
    });


    // 14-day trend
    const days = Array.from({ length: 14 }).map((_, i) => {
      const d = startOfDay(subDays(new Date(), 13 - i));
      const key = format(d, "yyyy-MM-dd");
      return { date: format(d, "MMM d"), key, sales: 0, expenses: 0 };
    });
    sales.forEach((r) => {
      const k = format(new Date(r.created_at), "yyyy-MM-dd");
      const day = days.find((d) => d.key === k);
      if (day) day.sales += Number(r.amount);
    });
    expenses.forEach((r) => {
      const k = format(new Date(r.created_at), "yyyy-MM-dd");
      const day = days.find((d) => d.key === k);
      if (day) day.expenses += Number(r.amount);
    });
    setTrend(days);

    if (isAdmin) {
      const { data: sm } = await supabase.from("supermarkets").select("id,name,location");
      const localSm = JSON.parse(localStorage.getItem("twimu_fallback_supermarkets") || "[]");
      const allSm = [...localSm, ...(sm ?? [])];

      // Default preset branches to guarantee 4 panels if empty or missing
      const defaultBranches = [
        { id: "preset-1", name: "Kampala Central Branch", location: "Kampala Road" },
        { id: "preset-2", name: "Entebbe Road Branch", location: "Lubowa" },
        { id: "preset-3", name: "Jinja Highway Branch", location: "Mukono" },
        { id: "preset-4", name: "Mbarara Highway Branch", location: "Mbarara City" }
      ];

      defaultBranches.forEach(df => {
        if (!allSm.some(s => s.id === df.id || s.name.toLowerCase() === df.name.toLowerCase())) {
          allSm.push(df);
        }
      });

      const map = new Map(allSm.map((x) => [x.id, x.name]));
      const agg = new Map<string, number>();
      sales.forEach((r) => agg.set(r.supermarket_id, (agg.get(r.supermarket_id) ?? 0) + Number(r.amount)));
      setByBranch(Array.from(agg.entries()).map(([id, v]) => ({ name: map.get(id) ?? "—", sales: v })));

      // Calculate branch-by-branch panels for the 4 supermarkets
      const panels = allSm.map(branch => {
        const branchSales = sales.filter((x: any) => x.supermarket_id === branch.id);
        const branchExpenses = expenses.filter((x: any) => x.supermarket_id === branch.id);
        const branchStock = stock.filter((x: any) => x.supermarket_id === branch.id);
        const branchSalaries = salaries.filter((x: any) => x.supermarket_id === branch.id);

        return {
          id: branch.id,
          name: branch.name,
          location: branch.location || "Uganda",
          sales: branchSales.reduce((a, r) => a + Number(r.amount), 0),
          expenses: branchExpenses.reduce((a, r) => a + Number(r.amount), 0),
          stockCount: branchStock.length,
          payroll: branchSalaries.reduce((a, r) => a + Number(r.monthly_salary), 0),
        };
      });

      setBranchPanels(panels);
    }

    // Simple anomaly detection: amount > 2x avg
    if (sales.length > 0) {
      const avg = sales.reduce((a, r) => a + Number(r.amount), 0) / sales.length;
      setAnomalies(sales.filter((r) => Number(r.amount) > avg * 2).slice(0, 5).map((r, i) => ({ id: String(i), amount: Number(r.amount), created_at: r.created_at })));
    }
  }

  if (!isAdmin) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl border border-pink-100/80 bg-white/95 p-8 shadow-xl shadow-pink-100/30 backdrop-blur-md">
          {/* Ambient decorative blobs for premium visual design */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-pink-100/30 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-rose-100/20 blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-50 border border-pink-100/50 text-xs font-semibold text-pink-600">
                <Store className="size-3.5" /> Twimu ERP Console
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 md:text-4xl">
                Welcome back, <span className="bg-gradient-to-r from-pink-500 to-rose-600 bg-clip-text text-transparent">{fullName || "Manager"}</span>!
              </h1>
              <p className="text-slate-500 max-w-xl text-base leading-relaxed">
                Your manager account is securely registered and active. Twimu ERP keeps data safe and structured. Use the entry modules below to record daily sales, log expenses, manage stock, and track salaries.
              </p>
            </div>
            
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20 text-white font-black text-2xl">
                {(fullName || "M").charAt(0).toUpperCase()}
              </div>
              <Button onClick={logout} variant="outline" size="sm" className="text-pink-600 border-pink-200 hover:bg-pink-50 rounded-xl w-full">
                <LogOut className="size-3.5 mr-2" /> Log out
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold tracking-tight text-slate-700">Quick Entries & Data Logging</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link to="/sales">
              <Card className="group relative overflow-hidden bg-white/95 border-pink-100 shadow-md shadow-pink-100/20 hover:shadow-lg hover:shadow-pink-100/30 hover:-translate-y-0.5 transition-all text-slate-800 backdrop-blur-md cursor-pointer">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3.5 rounded-2xl bg-pink-50 text-pink-600 group-hover:bg-pink-100 transition-colors">
                      <ShoppingCart className="size-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 group-hover:text-pink-600 transition-colors">Sales Register</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Record customer sales and store receipts</p>
                    </div>
                  </div>
                  <ArrowRight className="size-5 text-slate-300 group-hover:text-pink-500 group-hover:translate-x-1 transition-all" />
                </CardContent>
              </Card>
            </Link>

            <Link to="/expenses">
              <Card className="group relative overflow-hidden bg-white/95 border-pink-100 shadow-md shadow-pink-100/20 hover:shadow-lg hover:shadow-pink-100/30 hover:-translate-y-0.5 transition-all text-slate-800 backdrop-blur-md cursor-pointer">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3.5 rounded-2xl bg-pink-50 text-pink-600 group-hover:bg-pink-100 transition-colors">
                      <Receipt className="size-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 group-hover:text-pink-600 transition-colors">Expense Logger</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Log operational expenses and bills</p>
                    </div>
                  </div>
                  <ArrowRight className="size-5 text-slate-300 group-hover:text-pink-500 group-hover:translate-x-1 transition-all" />
                </CardContent>
              </Card>
            </Link>

            <Link to="/stock">
              <Card className="group relative overflow-hidden bg-white/95 border-pink-100 shadow-md shadow-pink-100/20 hover:shadow-lg hover:shadow-pink-100/30 hover:-translate-y-0.5 transition-all text-slate-800 backdrop-blur-md cursor-pointer">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3.5 rounded-2xl bg-pink-50 text-pink-600 group-hover:bg-pink-100 transition-colors">
                      <Package className="size-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 group-hover:text-pink-600 transition-colors">Stock & Inventory</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Update item quantities and alert levels</p>
                    </div>
                  </div>
                  <ArrowRight className="size-5 text-slate-300 group-hover:text-pink-500 group-hover:translate-x-1 transition-all" />
                </CardContent>
              </Card>
            </Link>

            <Link to="/salaries">
              <Card className="group relative overflow-hidden bg-white/95 border-pink-100 shadow-md shadow-pink-100/20 hover:shadow-lg hover:shadow-pink-100/30 hover:-translate-y-0.5 transition-all text-slate-800 backdrop-blur-md cursor-pointer">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3.5 rounded-2xl bg-pink-50 text-pink-600 group-hover:bg-pink-100 transition-colors">
                      <Users className="size-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 group-hover:text-pink-600 transition-colors">Salaries & Payroll</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Process and check staff payments</p>
                    </div>
                  </div>
                  <ArrowRight className="size-5 text-slate-300 group-hover:text-pink-500 group-hover:translate-x-1 transition-all" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Last 14 days {isAdmin ? "across all branches" : "for your branch"}.</p>
        </div>
        {isAdmin && (
          <Button onClick={logout} variant="outline" className="text-pink-600 border-pink-200 hover:bg-pink-50 rounded-xl shadow-sm md:self-start">
            <LogOut className="size-4 mr-2" /> Log out
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ShoppingCart} label="Sales" value={fmt(stats.sales)} hint={`${stats.salesCount} transactions`} />
        <StatCard icon={Receipt} label="Expenses" value={fmt(stats.expenses)} />
        <StatCard icon={Package} label="Stock items" value={String(stats.stockItems)} hint={stats.lowStock ? `${stats.lowStock} low stock` : "All healthy"} warning={stats.lowStock > 0} />
        <StatCard icon={Users} label="Monthly payroll" value={fmt(stats.salaries)} />
      </div>

      {/* Supermarket Branch Panels */}
      {isAdmin && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2 mt-2">
            <Store className="size-5 text-pink-500" /> Supermarket Branches
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {branchPanels.map((bp) => {
              const netProfit = bp.sales - bp.expenses;
              return (
                <Card key={bp.id} className="bg-white/95 border-pink-100 shadow-md shadow-pink-100/20 backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-[0.02] text-pink-500 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                    <Store className="size-36" />
                  </div>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-800">{bp.name}</CardTitle>
                      <CardDescription className="text-slate-400 text-xs mt-0.5">{bp.location}</CardDescription>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-pink-50 border border-pink-100 text-pink-500">
                      <Store className="size-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-pink-50/20 rounded-2xl border border-pink-50 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-pink-100 text-pink-600">
                          <ShoppingCart className="size-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Sales</div>
                          <div className="text-sm font-extrabold text-slate-800">{fmt(bp.sales)}</div>
                        </div>
                      </div>
                      <div className="p-3 bg-rose-50/20 rounded-2xl border border-rose-50 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
                          <Receipt className="size-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Expenses</div>
                          <div className="text-sm font-extrabold text-slate-800">{fmt(bp.expenses)}</div>
                        </div>
                      </div>
                      <div className="p-3 bg-emerald-50/20 rounded-2xl border border-emerald-50 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                          <TrendingUp className="size-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Net Profit</div>
                          <div className={`text-sm font-extrabold ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(netProfit)}</div>
                        </div>
                      </div>
                      <div className="p-3 bg-indigo-50/20 rounded-2xl border border-indigo-50 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
                          <Package className="size-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Stock Items</div>
                          <div className="text-sm font-extrabold text-slate-800">{bp.stockCount} SKUs</div>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-50 flex justify-between items-center text-xs text-slate-400">
                      <span>Payroll: <strong>{fmt(bp.payroll)}</strong></span>
                      <Button 
                        onClick={() => {
                          localStorage.setItem("twimu_preselected_branch_id", bp.id);
                          navigate({ to: "/supermarkets" });
                        }}
                        variant="ghost" 
                        size="sm" 
                        className="text-pink-600 hover:text-pink-700 hover:bg-pink-50/50 p-0 h-auto font-bold flex items-center gap-1 cursor-pointer"
                      >
                        Audit Branch <ArrowRight className="size-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-white/95 border-pink-100 shadow-md shadow-pink-100/30 text-slate-800 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-800">Sales vs Expenses</CardTitle>
            <CardDescription className="text-slate-500">14-day trend</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
                <XAxis dataKey="date" fontSize={12} stroke="rgba(15,23,42,0.4)" tickLine={false} axisLine={false} dy={10} />
                <YAxis fontSize={12} stroke="rgba(15,23,42,0.4)" tickLine={false} axisLine={false} tickFormatter={(value) => `UGX ${(value / 1000)}k`} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'rgba(244,63,94,0.1)', borderRadius: '12px', color: '#0f172a', boxShadow: '0 4px 12px rgba(244,63,94,0.08)' }} 
                  itemStyle={{ color: '#0f172a' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="sales" stroke="#ff69b4" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="expenses" stroke="#fb7185" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {isAdmin ? (
          <Card className="bg-white/95 border-pink-100 shadow-md shadow-pink-100/30 text-slate-800 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-800">Sales by branch</CardTitle>
              <CardDescription className="text-slate-500">Last 14 days</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byBranch} margin={{ top: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} stroke="rgba(15,23,42,0.4)" tickLine={false} axisLine={false} dy={10} />
                  <YAxis fontSize={12} stroke="rgba(15,23,42,0.4)" tickLine={false} axisLine={false} tickFormatter={(value) => `${(value / 1000)}k`} dx={-10} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(244,63,94,0.04)' }}
                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'rgba(244,63,94,0.1)', borderRadius: '12px', color: '#0f172a', boxShadow: '0 4px 12px rgba(244,63,94,0.08)' }} 
                  />
                  <Bar dataKey="sales" fill="#ff69b4" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white/95 border-pink-100 shadow-md shadow-pink-100/30 text-slate-800 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="size-4 text-pink-500" /> Performance
              </CardTitle>
              <CardDescription className="text-slate-500">Profit estimate (sales − expenses)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-extrabold text-pink-600 tracking-tight">{fmt(stats.sales - stats.expenses)}</div>
              <p className="text-sm text-slate-500 mt-2">Across the last 14 days for your branch.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {isAdmin && anomalies.length > 0 && (
        <Card className="bg-red-50 border-red-100 shadow-md shadow-red-100/10 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base font-bold text-red-700 flex items-center gap-2">
              <AlertTriangle className="size-4" /> Possible anomalies
            </CardTitle>
            <CardDescription className="text-red-600">Sales above 2× the recent average.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {anomalies.map((a) => (
                <li key={a.id} className="flex justify-between border-b border-red-100 last:border-0 pb-2">
                  <span className="text-red-600">{format(new Date(a.created_at), "MMM d, HH:mm")}</span>
                  <span className="font-semibold text-red-700">{fmt(a.amount)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, warning }: { icon: React.ComponentType<{ className?: string }>, label: string, value: string, hint?: string, warning?: boolean }) {
  return (
    <Card className={`backdrop-blur-md shadow-md shadow-pink-100/20 transition-all hover:-translate-y-1 ${warning ? "bg-red-50 border-red-100" : "bg-white/95 border-pink-100 text-slate-800"}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`text-sm font-semibold ${warning ? "text-red-600" : "text-slate-500"}`}>{label}</div>
          <div className={`p-2 rounded-xl ${warning ? "bg-red-100 text-red-600" : "bg-pink-100 text-pink-600"}`}>
            <Icon className="size-4" />
          </div>
        </div>
        <div className={`text-3xl font-extrabold tracking-tight ${warning ? "text-red-700" : "text-slate-800"}`}>{value}</div>
        {hint && <div className={`text-xs mt-2 font-medium ${warning ? "text-red-600" : "text-slate-400"}`}>{hint}</div>}
      </CardContent>
    </Card>
  );
}
