import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Users, Banknote, Clock, CheckCircle2, Plus, Search, Building2 } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/salaries")({
  component: SalariesPage,
  head: () => ({ meta: [{ title: "Salaries — Twimu ERP" }] }),
});

function fmt(n: number) {
  return new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(n);
}

function SalariesPage() {
  const { roles, supermarketId } = useAuth();
  const isAdmin = roles.includes("admin");
  const [salaries, setSalaries] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ employee_name: "", position: "", monthly_salary: "", payment_status: "pending" });
  
  useEffect(() => { load(); }, [supermarketId, isAdmin]);

  async function load() {
    let q = supabase.from("salaries").select("*, supermarkets(name)").order("employee_name");
    if (!isAdmin && supermarketId) {
      q = q.eq("supermarket_id", supermarketId);
    }
    const { data } = await q;
    
    // Merge with local fallback data
    const localData = JSON.parse(localStorage.getItem("twimu_fallback_salaries") || "[]");
    const filteredLocal = (!isAdmin && supermarketId) 
      ? localData.filter((x: any) => x.supermarket_id === supermarketId)
      : localData;
      
    setSalaries([...filteredLocal, ...(data ?? [])]);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin && !supermarketId) return toast.error("No supermarket branch assigned");
    
    // For admins, we just use a default or force them to use supermarkets module. 
    // Usually admins don't add salaries directly without a branch context, but we will allow fallback.
    const targetSupermarketId = isAdmin ? (salaries[0]?.supermarket_id || "admin-branch") : supermarketId;

    const payload = {
      ...form,
      monthly_salary: Number(form.monthly_salary),
      supermarket_id: targetSupermarketId,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from("salaries").insert([payload]);

    if (error) {
      // Use local storage fallback
      const newRow = { id: `local-${Date.now()}`, ...payload };
      const localData = JSON.parse(localStorage.getItem("twimu_fallback_salaries") || "[]");
      localStorage.setItem("twimu_fallback_salaries", JSON.stringify([newRow, ...localData]));
      toast.success("Employee added locally!");
      setForm({ employee_name: "", position: "", monthly_salary: "", payment_status: "pending" });
      load();
      return;
    }

    toast.success("Employee added!");
    setForm({ employee_name: "", position: "", monthly_salary: "", payment_status: "pending" });
    load();
  }

  async function markAsPaid(id: string, isLocal: boolean) {
    const paymentDate = new Date().toISOString();
    
    if (isLocal) {
      const localData = JSON.parse(localStorage.getItem("twimu_fallback_salaries") || "[]");
      const updated = localData.map((s: any) => 
        s.id === id ? { ...s, payment_status: "paid", payment_date: paymentDate } : s
      );
      localStorage.setItem("twimu_fallback_salaries", JSON.stringify(updated));
      toast.success("Marked as paid locally");
      load();
      return;
    }

    const { error } = await supabase
      .from("salaries")
      .update({ payment_status: "paid", payment_date: paymentDate })
      .eq("id", id);
      
    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Salary marked as paid");
      load();
    }
  }

  // Derived metrics
  const filteredSalaries = salaries.filter(s => 
    s.employee_name?.toLowerCase().includes(search.toLowerCase()) || 
    s.position?.toLowerCase().includes(search.toLowerCase())
  );
  
  const totalPayroll = salaries.reduce((acc, curr) => acc + Number(curr.monthly_salary), 0);
  const pendingAmount = salaries.filter(s => s.payment_status === "pending").reduce((acc, curr) => acc + Number(curr.monthly_salary), 0);
  const paidCount = salaries.filter(s => s.payment_status === "paid").length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Salaries & HR</h1>
        <p className="text-sm text-slate-500 mt-1">Manage employee payroll and track payment statuses {isAdmin ? "across all branches" : "for your branch"}.</p>
      </div>

      {/* Top Summary Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Employees" value={String(salaries.length)} color="text-pink-600" bg="bg-pink-100" />
        <StatCard icon={Banknote} label="Total Monthly Payroll" value={fmt(totalPayroll)} color="text-rose-600" bg="bg-rose-100" />
        <StatCard icon={Clock} label="Pending Payments" value={fmt(pendingAmount)} color="text-amber-600" bg="bg-amber-100" warning={pendingAmount > 0} />
        <StatCard icon={CheckCircle2} label="Salaries Paid" value={`${paidCount} / ${salaries.length}`} color="text-emerald-600" bg="bg-emerald-100" />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Form */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="bg-white/95 border-pink-100 shadow-md shadow-pink-100/30 backdrop-blur-md">
            <CardHeader className="pb-4 border-b border-pink-50">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="size-5 text-pink-500" /> Add Employee
              </CardTitle>
              <CardDescription className="text-slate-500">Register a new staff member and their salary.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={add} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-600 font-semibold text-xs uppercase tracking-wide">Full Name</Label>
                  <Input required value={form.employee_name} onChange={e => setForm({...form, employee_name: e.target.value})} className="bg-slate-50 border-pink-200 focus-visible:ring-pink-500 h-10 rounded-xl" placeholder="John Doe" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-600 font-semibold text-xs uppercase tracking-wide">Job Position</Label>
                  <Input required value={form.position} onChange={e => setForm({...form, position: e.target.value})} className="bg-slate-50 border-pink-200 focus-visible:ring-pink-500 h-10 rounded-xl" placeholder="Cashier" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-600 font-semibold text-xs uppercase tracking-wide">Monthly Salary (UGX)</Label>
                  <Input required type="number" value={form.monthly_salary} onChange={e => setForm({...form, monthly_salary: e.target.value})} className="bg-slate-50 border-pink-200 focus-visible:ring-pink-500 h-10 rounded-xl" placeholder="500000" />
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-md shadow-pink-500/25 border-0 h-11 rounded-xl mt-2 transition-all hover:scale-[1.02]">
                  <Plus className="size-4 mr-2" /> Register Employee
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: List */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-white/95 border-pink-100 shadow-md shadow-pink-100/30 backdrop-blur-md overflow-hidden">
            <CardHeader className="pb-4 border-b border-pink-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">Payroll Roster</CardTitle>
                <CardDescription className="text-slate-500">View and manage employee salaries.</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input 
                  placeholder="Search employees..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-slate-50 border-pink-200 focus-visible:ring-pink-500 rounded-xl h-10" 
                />
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-pink-50/50">
                  <TableRow className="hover:bg-transparent border-pink-100">
                    <TableHead className="font-semibold text-slate-600 w-[200px]">Employee</TableHead>
                    {isAdmin && <TableHead className="font-semibold text-slate-600">Branch</TableHead>}
                    <TableHead className="font-semibold text-slate-600">Salary</TableHead>
                    <TableHead className="font-semibold text-slate-600">Status</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSalaries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 5 : 4} className="h-32 text-center text-slate-400">
                        No employees found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSalaries.map((s) => {
                      const isPaid = s.payment_status === "paid";
                      const isLocal = String(s.id).startsWith("local-");
                      return (
                        <TableRow key={s.id} className="hover:bg-pink-50/30 border-pink-50 transition-colors">
                          <TableCell>
                            <div className="font-bold text-slate-800">{s.employee_name}</div>
                            <div className="text-xs text-slate-500">{s.position}</div>
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 py-1 px-2 rounded-md inline-flex">
                                <Building2 className="size-3 text-pink-500" />
                                {s.supermarkets?.name || "Local Branch"}
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="font-semibold text-slate-700">
                            {fmt(s.monthly_salary)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={isPaid ? "default" : "secondary"} className={`capitalize ${isPaid ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0" : "bg-amber-100 text-amber-700 hover:bg-amber-200 border-0"}`}>
                              {isPaid ? <CheckCircle2 className="size-3 mr-1" /> : <Clock className="size-3 mr-1" />}
                              {s.payment_status}
                            </Badge>
                            {isPaid && s.payment_date && (
                              <div className="text-[10px] text-slate-400 mt-1">
                                {format(new Date(s.payment_date), "MMM d, yyyy")}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!isPaid && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => markAsPaid(s.id, isLocal)}
                                className="h-8 rounded-lg text-xs font-semibold border-pink-200 text-pink-600 hover:bg-pink-50 hover:text-pink-700 transition-colors"
                              >
                                Mark Paid
                              </Button>
                            )}
                            {isPaid && (
                              <span className="text-xs font-medium text-slate-400">Settled</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg, warning }: { icon: any, label: string, value: string, color: string, bg: string, warning?: boolean }) {
  return (
    <Card className={`backdrop-blur-md shadow-md transition-all hover:-translate-y-1 ${warning ? "bg-amber-50/80 border-amber-200 shadow-amber-100/40" : "bg-white/95 border-pink-100 shadow-pink-100/20"}`}>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3.5 rounded-2xl ${bg} ${color}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-extrabold tracking-tight mt-0.5 ${warning ? "text-amber-700" : "text-slate-800"}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
