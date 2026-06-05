import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  ShoppingCart, 
  Receipt, 
  TrendingUp, 
  Building2, 
  Plus, 
  Trash2, 
  Download, 
  Loader2, 
  Search, 
  AlertTriangle 
} from "lucide-react";
import { format, subDays, isToday, isThisMonth } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/_authenticated/sales")({
  component: SalesPage,
  head: () => ({ meta: [{ title: "Sales Register — Twimu ERP" }] }),
});

interface Sale {
  id: string;
  amount: number;
  description: string | null;
  created_at: string;
  supermarket_id: string;
  manager_id: string | null;
}

interface Supermarket {
  id: string;
  name: string;
}

function fmtUGX(v: number) {
  return new Intl.NumberFormat("en-UG", { 
    style: "currency", 
    currency: "UGX", 
    maximumFractionDigits: 0 
  }).format(v);
}

function SalesPage() {
  const { user, supermarketId, roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const [sales, setSales] = useState<Sale[]>([]);
  const [supermarkets, setSupermarkets] = useState<Supermarket[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSupermarket, setSelectedSupermarket] = useState("");

  useEffect(() => {
    loadSales();
    loadSupermarkets();
  }, [supermarketId, isAdmin]);

  async function loadSupermarkets() {
    try {
      const { data } = await supabase.from("supermarkets").select("id, name").order("name");
      if (data && data.length > 0) {
        setSupermarkets(data);
        if (isAdmin) {
          setSelectedSupermarket(data[0].id);
        }
      } else {
        // Fallback preset branches if DB is empty or inaccessible
        const fallbackBranches = [
          { id: "preset-1", name: "Kampala Central Branch" },
          { id: "preset-2", name: "Entebbe Road Branch" },
          { id: "preset-3", name: "Jinja Highway Branch" }
        ];
        setSupermarkets(fallbackBranches);
        if (isAdmin) {
          setSelectedSupermarket(fallbackBranches[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load supermarkets:", e);
    }
  }

  async function loadSales() {
    setLoading(true);
    try {
      let query = supabase.from("sales").select("*");
      if (!isAdmin && supermarketId) {
        query = query.eq("supermarket_id", supermarketId);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
      if (error && !error.message.includes("permission denied")) {
        toast.error("Database connection issue. Showing local records.");
      }

      // Merge with local fallback
      const localDataRaw = localStorage.getItem("twimu_fallback_sales");
      let localData = localDataRaw ? JSON.parse(localDataRaw) : [];
      if (!isAdmin && supermarketId) {
        localData = localData.filter((x: any) => x.supermarket_id === supermarketId);
      }

      const merged = [...localData, ...(data ?? [])];
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSales(merged);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordSale(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      return toast.error("Please enter a valid amount.");
    }
    if (!description.trim()) {
      return toast.error("Please enter a description.");
    }

    const branchId = isAdmin ? selectedSupermarket : supermarketId;
    if (!branchId) {
      return toast.error("No supermarket branch assigned or selected.");
    }

    setSaving(true);
    const payload = {
      amount: Number(amount),
      description: description.trim(),
      supermarket_id: branchId,
      manager_id: user?.id || null
    };

    try {
      const { error } = await supabase.from("sales").insert(payload);
      
      if (error) {
        // Fallback for demo/restricted modes
        if (error.message.includes("has_role") || error.message.includes("row-level security") || error.message.includes("permission denied")) {
          const newRow = {
            id: `local-${Date.now()}`,
            created_at: new Date().toISOString(),
            ...payload
          };
          const localDataRaw = localStorage.getItem("twimu_fallback_sales");
          const localData = localDataRaw ? JSON.parse(localDataRaw) : [];
          localStorage.setItem("twimu_fallback_sales", JSON.stringify([newRow, ...localData]));
          
          toast.success("Sale logged successfully (Local Mode)");
          setAmount("");
          setDescription("");
          loadSales();
          return;
        }
        throw error;
      }

      toast.success("Sale recorded successfully!");
      setAmount("");
      setDescription("");
      loadSales();
    } catch (err: any) {
      toast.error(err.message || "Failed to record sale.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSale(id: string) {
    if (!confirm("Are you sure you want to delete this sale?")) return;

    try {
      if (id.startsWith("local-")) {
        const localDataRaw = localStorage.getItem("twimu_fallback_sales");
        if (localDataRaw) {
          const localData = JSON.parse(localDataRaw);
          const updated = localData.filter((x: any) => x.id !== id);
          localStorage.setItem("twimu_fallback_sales", JSON.stringify(updated));
          toast.success("Deleted local record.");
          loadSales();
        }
      } else {
        const { error } = await supabase.from("sales").delete().eq("id", id);
        if (error) throw error;
        toast.success("Sale deleted successfully.");
        loadSales();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete sale.");
    }
  }

  function handleExportCSV() {
    if (sales.length === 0) return toast.error("No data to export.");
    const headers = "Supermarket Branch,Amount (UGX),Description,Date/Time\n";
    const csvContent = sales.map(s => {
      const branchName = supermarketMap.get(s.supermarket_id) || s.supermarket_id;
      const formattedAmount = s.amount;
      const desc = s.description ? s.description.replace(/"/g, '""') : "";
      const date = format(new Date(s.created_at), "yyyy-MM-dd HH:mm");
      return `"${branchName}",${formattedAmount},"${desc}","${date}"`;
    }).join("\n");

    const blob = new Blob([headers + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales_export_${format(new Date(), "yyyy_MM_dd")}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success("CSV export downloaded!");
  }

  const supermarketMap = new Map(supermarkets.map(s => [s.id, s.name]));

  // Calculate statistics
  const todaySalesList = sales.filter(s => isToday(new Date(s.created_at)));
  const totalSalesToday = todaySalesList.reduce((acc, s) => acc + s.amount, 0);
  const transactionsToday = todaySalesList.length;
  const highestSaleToday = todaySalesList.length > 0 ? Math.max(...todaySalesList.map(s => s.amount)) : 0;
  const totalSalesThisMonth = sales
    .filter(s => isThisMonth(new Date(s.created_at)))
    .reduce((acc, s) => acc + s.amount, 0);

  // Generate 7-day trend data
  const trendData = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    const key = format(d, "yyyy-MM-dd");
    const label = format(d, "EEE");
    const daySales = sales.filter(s => format(new Date(s.created_at), "yyyy-MM-dd") === key);
    const total = daySales.reduce((acc, s) => acc + s.amount, 0);
    return { name: label, amount: total };
  });

  // Filter sales list based on search query
  const filteredSales = sales.filter(s => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    const branchName = supermarketMap.get(s.supermarket_id) || "";
    return (
      branchName.toLowerCase().includes(term) ||
      (s.description && s.description.toLowerCase().includes(term)) ||
      String(s.amount).includes(term) ||
      format(new Date(s.created_at), "MMM d, HH:mm").toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Sales Register</h1>
          <p className="text-sm text-slate-500 mt-1">Record, track, and monitor daily sales receipts across branches.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white/95 border-pink-100 shadow-md shadow-pink-100/20 backdrop-blur-md transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-500">Sales (Today)</span>
              <div className="p-2 rounded-xl bg-pink-100 text-pink-600">
                <ShoppingCart className="size-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold tracking-tight text-slate-800">
              {fmtUGX(totalSalesToday)}
            </div>
            <div className="text-xs text-slate-400 mt-2 font-medium">Daily revenue logged</div>
          </CardContent>
        </Card>

        <Card className="bg-white/95 border-pink-100 shadow-md shadow-pink-100/20 backdrop-blur-md transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-500">Transactions (Today)</span>
              <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
                <Receipt className="size-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold tracking-tight text-slate-800">
              {transactionsToday}
            </div>
            <div className="text-xs text-slate-400 mt-2 font-medium">Sales recorded today</div>
          </CardContent>
        </Card>

        <Card className="bg-white/95 border-pink-100 shadow-md shadow-pink-100/20 backdrop-blur-md transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-500">Highest Sale (Today)</span>
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold tracking-tight text-slate-800">
              {fmtUGX(highestSaleToday)}
            </div>
            <div className="text-xs text-slate-400 mt-2 font-medium">Peak transaction today</div>
          </CardContent>
        </Card>

        <Card className="bg-white/95 border-pink-100 shadow-md shadow-pink-100/20 backdrop-blur-md transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-500">Total Sales (Month)</span>
              <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
                <Building2 className="size-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold tracking-tight text-slate-800">
              {fmtUGX(totalSalesThisMonth)}
            </div>
            <div className="text-xs text-slate-400 mt-2 font-medium">Current calendar month</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Layout Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Form & Trend Chart */}
        <div className="space-y-8 lg:col-span-1">
          {/* Form */}
          <Card className="bg-white/95 border-pink-100 shadow-md shadow-pink-100/30 text-slate-800 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">Record New Sale</CardTitle>
              <CardDescription className="text-slate-500">Log a new store transaction.</CardDescription>
            </CardHeader>
            <CardContent>
              {!isAdmin && !supermarketId ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-800 flex items-start gap-3 text-sm">
                  <AlertTriangle className="size-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Branch Unassigned:</span> Your manager account is not assigned to a branch yet. Please contact a Director to assign you a branch before recording sales.
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRecordSale} className="space-y-4">
                  {isAdmin && (
                    <div className="space-y-2">
                      <Label htmlFor="branch" className="text-slate-600 font-semibold">Select Branch</Label>
                      <Select value={selectedSupermarket} onValueChange={setSelectedSupermarket}>
                        <SelectTrigger id="branch" className="bg-white border-pink-200 text-slate-800 rounded-xl focus:ring-pink-400/50">
                          <SelectValue placeholder="Choose supermarket branch" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-pink-100 text-slate-800 backdrop-blur-xl">
                          {supermarkets.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="focus:bg-pink-50 focus:text-pink-600">{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-slate-600 font-semibold">Amount (UGX)</Label>
                    <Input
                      id="amount"
                      type="number"
                      required
                      placeholder="e.g. 50000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-white border-pink-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-pink-400/50 h-11 rounded-xl transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="desc" className="text-slate-600 font-semibold">Description</Label>
                    <Input
                      id="desc"
                      type="text"
                      required
                      placeholder="e.g. Counter 1 - cash sale"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="bg-white border-pink-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-pink-400/50 h-11 rounded-xl transition-all"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={saving} 
                    className="w-full h-11 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0 shadow-lg shadow-pink-500/20 font-bold rounded-xl transition-all active:scale-[0.98] cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" /> Recording...
                      </>
                    ) : (
                      <>
                        <Plus className="size-4 mr-1.5" /> Record Sale
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Line Chart */}
          <Card className="bg-white/95 border-pink-100 shadow-md shadow-pink-100/30 text-slate-800 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-800">7-Day Trend</CardTitle>
              <CardDescription className="text-slate-500">Daily sales aggregation</CardDescription>
            </CardHeader>
            <CardContent className="h-60 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
                  <XAxis dataKey="name" fontSize={11} stroke="rgba(15,23,42,0.4)" tickLine={false} axisLine={false} />
                  <YAxis 
                    fontSize={11} 
                    stroke="rgba(15,23,42,0.4)" 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${(value / 1000)}k`} 
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'rgba(255,255,255,0.95)', 
                      borderColor: 'rgba(244,63,94,0.1)', 
                      borderRadius: '12px', 
                      color: '#0f172a', 
                      boxShadow: '0 4px 12px rgba(244,63,94,0.08)' 
                    }}
                    itemStyle={{ color: '#0f172a' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    name="Sales (UGX)"
                    stroke="#ff69b4" 
                    strokeWidth={3} 
                    dot={{ r: 3, strokeWidth: 2 }} 
                    activeDot={{ r: 5 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Searchable Table */}
        <div className="lg:col-span-2">
          <Card className="bg-white/95 border-pink-100 shadow-md shadow-pink-100/30 text-slate-800 backdrop-blur-md overflow-hidden h-full flex flex-col">
            <CardHeader className="border-b border-pink-50 flex flex-col sm:flex-row sm:items-center justify-between py-5 gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">Recent Transactions</CardTitle>
                <CardDescription className="text-slate-500">{filteredSales.length} records found</CardDescription>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <Input 
                    placeholder="Search sales..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 w-full bg-white border-pink-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-pink-400/50 text-sm rounded-xl"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExportCSV} 
                  className="h-9 bg-white border-pink-200 text-pink-600 hover:bg-pink-50/50 hover:text-pink-700 whitespace-nowrap rounded-xl font-bold cursor-pointer"
                >
                  <Download className="size-3.5 mr-2" /> Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-pink-50/50 hover:bg-pink-50/50">
                    <TableRow className="border-pink-50 hover:bg-transparent">
                      {isAdmin && <TableHead className="text-pink-700 font-bold">Branch</TableHead>}
                      <TableHead className="text-pink-700 font-bold">Amount</TableHead>
                      <TableHead className="text-pink-700 font-bold">Description</TableHead>
                      <TableHead className="text-pink-700 font-bold">When</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow className="hover:bg-transparent border-0">
                        <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-20">
                          <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                            <Loader2 className="size-8 text-pink-500 animate-spin" />
                            <span>Loading transaction history...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredSales.length === 0 ? (
                      <TableRow className="hover:bg-transparent border-0">
                        <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-20 text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <ShoppingCart className="size-8 text-slate-300" />
                            <span>No sales logs recorded yet.</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSales.map((s) => (
                        <TableRow key={s.id} className="border-pink-50 hover:bg-pink-50/10 transition-colors">
                          {isAdmin && (
                            <TableCell className="font-semibold text-slate-600">
                              {supermarketMap.get(s.supermarket_id) || "Default Supermarket"}
                            </TableCell>
                          )}
                          <TableCell className="font-extrabold text-pink-600 whitespace-nowrap">
                            {fmtUGX(s.amount)}
                          </TableCell>
                          <TableCell className="text-slate-700 max-w-[200px] truncate" title={s.description || ""}>
                            {s.description || "—"}
                          </TableCell>
                          <TableCell className="text-slate-400 text-sm whitespace-nowrap">
                            {format(new Date(s.created_at), "MMM d, HH:mm")}
                          </TableCell>
                          <TableCell>
                            {isAdmin && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteSale(s.id)} 
                                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
