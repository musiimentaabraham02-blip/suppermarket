import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ReactNode, useState, useEffect } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Users,
  Store,
  ScrollText,
  LogOut,
  Bell,
  Building2,
  MapPin,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "manager"], accent: "text-indigo-400" },
  { to: "/sales", label: "Sales", icon: ShoppingCart, roles: ["admin", "manager"], accent: "text-emerald-400" },
  { to: "/expenses", label: "Expenses", icon: Receipt, roles: ["admin", "manager"], accent: "text-rose-400" },
  { to: "/stock", label: "Stock", icon: Package, roles: ["admin", "manager"], accent: "text-blue-400" },
  { to: "/salaries", label: "Salaries", icon: Users, roles: ["admin", "manager"], accent: "text-amber-400" },
  { to: "/supermarkets", label: "Supermarkets", icon: Store, roles: ["admin"], accent: "text-teal-400" },
  { to: "/audit", label: "Audit log", icon: ScrollText, roles: ["admin"], accent: "text-slate-400" },
] as const;

const getGlowStyles = (pathname: string) => {
  switch (pathname) {
    case "/dashboard":
      return {
        topLeft: "linear-gradient(135deg, #ffc0cb, #fbc2eb)", // Pastel Pink / Rose
        bottomRight: "linear-gradient(135deg, #a1c4fd, #c2e9fb)", // Soft Pastel Blue
        opacityTop: "opacity-40",
        opacityBottom: "opacity-30",
      };
    case "/sales":
      return {
        topLeft: "linear-gradient(135deg, #e2f0d9, #c3e6cb)", // Soft Mint
        bottomRight: "linear-gradient(135deg, #fbc2eb, #e6b8af)", // Pastel Pink
        opacityTop: "opacity-45",
        opacityBottom: "opacity-35",
      };
    case "/expenses":
      return {
        topLeft: "linear-gradient(135deg, #fbc2eb, #a1c4fd)", // Pink to Lavender
        bottomRight: "linear-gradient(135deg, #ffd1d1, #ffb3b3)", // Pastel Red/Rose
        opacityTop: "opacity-40",
        opacityBottom: "opacity-30",
      };
    case "/stock":
      return {
        topLeft: "linear-gradient(135deg, #c2e9fb, #a1c4fd)", // Ice Blue
        bottomRight: "linear-gradient(135deg, #fbc2eb, #fbc2eb)", // Rose
        opacityTop: "opacity-45",
        opacityBottom: "opacity-35",
      };
    case "/salaries":
      return {
        topLeft: "linear-gradient(135deg, #ffe5b4, #ffd1a9)", // Pastel Gold / Orange
        bottomRight: "linear-gradient(135deg, #fbc2eb, #ffd1d1)", // Pink/Rose
        opacityTop: "opacity-40",
        opacityBottom: "opacity-30",
      };
    case "/supermarkets":
      return {
        topLeft: "linear-gradient(135deg, #e3faf2, #c3f2e4)", // Soft Turquoise
        bottomRight: "linear-gradient(135deg, #fbc2eb, #e8c3f2)", // Pastel Pink/Purple
        opacityTop: "opacity-45",
        opacityBottom: "opacity-35",
      };
    case "/audit":
      return {
        topLeft: "linear-gradient(135deg, #e2e8f0, #cbd5e1)", // Slate
        bottomRight: "linear-gradient(135deg, #fbc2eb, #e2e8f0)", // Pink/Slate
        opacityTop: "opacity-40",
        opacityBottom: "opacity-30",
      };
    default:
      return {
        topLeft: "linear-gradient(135deg, #fbc2eb, #a1c4fd)",
        bottomRight: "linear-gradient(135deg, #ffc0cb, #c2e9fb)",
        opacityTop: "opacity-40",
        opacityBottom: "opacity-30",
      };
  }
};

const getBackgroundImage = (roles: string[], pathname: string) => {
  if (pathname.includes("sales")) return 'url("/sales-bg.jpg")';
  if (pathname.includes("expenses")) return 'url("/expenses-bg.jpg")';
  if (pathname.includes("stock")) return 'url("/stock-bg.jpg")';
  if (pathname.includes("salaries")) return 'url("/salaries-bg.jpg")';
  if (pathname.includes("supermarkets")) return 'url("/supermarkets-bg.jpg")';
  if (pathname.includes("audit")) return 'url("/audit-bg.jpg")';
  return 'url("/supermarket-bg.jpg")';
};


export function AppShell({ children }: { children: ReactNode }) {
  const { roles, fullName, user, supermarketId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = roles.includes("admin");

  interface Supermarket {
    id: string;
    name: string;
    location: string | null;
  }
  const [supermarkets, setSupermarkets] = useState<Supermarket[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingSupermarkets, setLoadingSupermarkets] = useState(false);

  useEffect(() => {
    // Only load if the user is a manager (not admin) and doesn't have a supermarket assigned yet
    if (user && roles.includes("manager") && !isAdmin && !supermarketId) {
      setLoadingSupermarkets(true);
      supabase.from("supermarkets")
        .select("id, name, location")
        .then(({ data, error }) => {
          if (error) {
            console.error("Failed to fetch supermarkets:", error);
          } else {
            setSupermarkets(data || []);
          }
          setLoadingSupermarkets(false);
        });
    }
  }, [user, roles, isAdmin, supermarketId]);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  async function handleConfirmBranch() {
    if (!selectedBranch || !user) return;
    setSaving(true);
    try {
      // 1. Update localStorage fallback immediately
      localStorage.setItem("twimu_fallback_supermarket_id_" + user.id, selectedBranch);

      // 2. Try to upsert profiles table to guarantee the profile row exists
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          supermarket_id: selectedBranch,
          email: user.email || null,
          full_name: fullName || user.user_metadata?.full_name || "Demo Manager",
          is_active: true
        });

      if (error) {
        const isPermissionDenied = error.message?.toLowerCase().includes("permission denied") || error.message?.toLowerCase().includes("has_role");
        if (isPermissionDenied) {
          toast.warning("Local Setup Completed: We detected a database RLS permissions lockout (requires SQL grant). Your branch setup has been saved locally so you can continue using the dashboard!", {
            duration: 12000
          });
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          return;
        }
        throw error;
      }

      toast.success("Supermarket branch assigned successfully!");

      // 3. Reload page to let useAuth fetch the new profile state
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err: any) {
      console.error("Error setting supermarket branch:", err);
      toast.error(err.message || "Failed to assign supermarket branch. Please try again.");
    } finally {
      setSaving(false);
    }
  }


  const glow = getGlowStyles(location.pathname);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#FFF5F6] via-white to-[#FFF0F2] text-slate-800 relative overflow-hidden font-sans">
      {/* Background Glows & Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Full-viewport background image overlay */}
        <div 
          className="absolute inset-0 opacity-[0.06] scale-105"
          style={{ 
            backgroundImage: getBackgroundImage(roles, location.pathname), 
            backgroundSize: 'cover', 
            backgroundPosition: 'center',
            filter: 'blur(5px)'
          }}
        />
        {/* Soft Wash Overlay */}
        <div className="absolute inset-0 bg-white/40" />
        <div 
          className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] transition-all duration-700 ease-in-out ${glow.opacityTop}`} 
          style={{ background: glow.topLeft }}
        />
        <div 
          className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] transition-all duration-700 ease-in-out ${glow.opacityBottom}`} 
          style={{ background: glow.bottomRight }}
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-overlay"></div>
      </div>

      {/* Sidebar - Main Menu Pink Background */}
      <aside className="w-64 bg-gradient-to-b from-pink-500 via-pink-600 to-rose-700 text-white shadow-xl shadow-pink-100/40 border-0 flex flex-col z-10">
        <div className="px-6 py-5 flex items-center gap-3 border-b border-white/10">
          <div className="p-1.5 rounded-lg bg-white/20 shadow-md">
            <Store className="size-4 text-white" />
          </div>
          <div className="font-bold tracking-tight text-white flex items-center gap-1.5">
            Twimu ERP <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold text-white/60 uppercase tracking-widest">
            Main Menu
          </div>
          <div className="space-y-1">
            {NAV.filter((n) => (n.roles as readonly string[]).includes("manager")).map((item) => {
              const active = location.pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                    active
                      ? "bg-white text-pink-600 font-bold shadow-md shadow-pink-900/10 border-0"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className={`size-4 ${active ? "text-pink-600" : "text-white/70"}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {isAdmin && (
            <>
              <div className="px-3 pt-8 pb-2 text-[10px] font-bold text-white/60 uppercase tracking-widest flex items-center justify-between">
                <div className="flex items-center gap-2"><Store className="size-3" /> Director Panel</div>
              </div>
              <div className="space-y-1">
                {NAV.filter((n) => !(n.roles as readonly string[]).includes("manager")).map((item) => {
                  const active = location.pathname === item.to;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                        active
                          ? "bg-white text-pink-600 font-bold shadow-md shadow-pink-900/10 border-0"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon className={`size-4 ${active ? "text-pink-600" : "text-white/70"}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <Avatar className="size-9 border border-white/20 shadow-sm">
              <AvatarFallback className="bg-white/20 text-white text-xs font-medium">
                {(fullName || user?.email || "U").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate text-white/90">{fullName || user?.email}</div>
              <div className="text-[11px] text-white/60 capitalize font-medium tracking-wide">{roles[0] === 'admin' ? 'Director' : 'Manager'}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="text-white/60 hover:bg-white/10 hover:text-white rounded-xl">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        <header className="h-16 border-b border-pink-100 bg-white/60 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
            <span>Twimu ERP</span> 
            <span className="text-slate-300">/</span> 
            <span className="text-slate-800 capitalize font-semibold">{location.pathname.replace("/", "") || "dashboard"}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={logout} className="text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl font-semibold transition-colors">
              <LogOut className="size-4 mr-2" />
              Log Out
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-pink-50 hover:text-pink-600 rounded-xl relative">
              <Bell className="size-4" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-pink-500 rounded-full"></span>
            </Button>
          </div>
        </header>
        <main className="flex-1 p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Fullscreen Supermarket Selection Modal */}
      {!isAdmin && roles.includes("manager") && !supermarketId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pink-950/20 backdrop-blur-xl overflow-y-auto animate-fade-in">
          {/* Ambient Glows */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <div 
              className="absolute top-[20%] left-[20%] w-[35%] h-[35%] rounded-full blur-[130px] opacity-35 animate-pulse" 
              style={{ background: 'linear-gradient(135deg, #fbc2eb, #a1c4fd)', animationDuration: '8s' }}
            />
            <div 
              className="absolute bottom-[20%] right-[20%] w-[35%] h-[35%] rounded-full blur-[130px] opacity-25 animate-pulse" 
              style={{ background: 'linear-gradient(135deg, #ffc0cb, #ffd1d1)', animationDuration: '12s' }}
            />
          </div>

          <div className="relative z-10 w-full max-w-xl bg-white/95 border border-pink-100/80 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-2xl text-slate-800 animate-scale-up">
            <div className="text-center mb-8">
              <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-xl shadow-pink-500/25 mb-5 relative">
                <Store className="size-6 text-white" />
                <Sparkles className="size-4 text-white absolute -top-1 -right-1 animate-bounce" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Branch Setup Required</h2>
              <p className="text-sm text-slate-500 mt-3 max-w-md mx-auto">
                Welcome, <span className="font-semibold text-pink-600">{fullName || user?.email}</span>! Please select the supermarket branch you work in. This choice will configure your ERP workspace.
              </p>
            </div>

            {loadingSupermarkets ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="size-8 text-pink-500 animate-spin" />
                <span className="text-sm text-slate-400">Fetching available branches...</span>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {supermarkets.map((branch) => {
                    const selected = selectedBranch === branch.id;
                    return (
                      <button
                        key={branch.id}
                        onClick={() => setSelectedBranch(branch.id)}
                        type="button"
                        className={`flex items-center justify-between p-5 rounded-2xl border text-left transition-all duration-300 w-full cursor-pointer ${
                          selected
                            ? "bg-pink-50 border-pink-300 shadow-[0_0_20px_rgba(244,63,94,0.1)] scale-[1.01]"
                            : "bg-slate-50 border-slate-200/60 hover:bg-pink-50/30 hover:border-pink-200 hover:scale-[1.005]"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl border transition-colors ${
                            selected ? "bg-pink-100 border-pink-300 text-pink-600" : "bg-slate-100 border-slate-200 text-slate-500"
                          }`}>
                            <Building2 className="size-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 text-base">{branch.name}</div>
                            {branch.location && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                                <MapPin className="size-3" />
                                {branch.location}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className={`size-5 rounded-full border flex items-center justify-center transition-all ${
                          selected ? "bg-pink-500 border-pink-400 text-white scale-110" : "border-slate-300 text-transparent"
                        }`}>
                          <Check className="size-3 stroke-[3]" />
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-slate-150 flex flex-col gap-3">
                  <Button
                    onClick={handleConfirmBranch}
                    disabled={!selectedBranch || saving}
                    className="w-full h-12 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-semibold rounded-2xl shadow-lg shadow-pink-500/25 border-0 flex items-center justify-center gap-2 group transition-all duration-300 hover:scale-[1.01] cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Saving assignment...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm Branch Assignment</span>
                        <Check className="size-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </Button>
                  
                  <button 
                    onClick={logout}
                    type="button"
                    className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-600 text-center transition-colors cursor-pointer"
                  >
                    Log out of this account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
