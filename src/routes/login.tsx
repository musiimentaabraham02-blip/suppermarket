import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Store, ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign in — Twimu ERP" }] }),
});

interface Sm { id: string; name: string }

function LoginPage() {
  const navigate = useNavigate();
  const [supermarkets, setSupermarkets] = useState<Sm[]>([]);
  const [loading, setLoading] = useState(false);

  // login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  // signup
  const [sName, setSName] = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sPwd, setSPwd] = useState("");
  const [sSm, setSSm] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
    
    setSupermarkets([
      { id: "preset", name: "(I'll be assigned by a director)" },
    ]);
    
    supabase.from("supermarkets").select("id,name").then(({ data }) => {
      if (data && data.length) setSupermarkets(data);
    });
  }, [navigate]);

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    let { error } = await supabase.auth.signInWithPassword({ email, password });
    
    // Auto-create Director demo account on first use if it does not exist in Supabase
    if (error && email === "admin@twimuerp.com" && password === "admin123") {
      const { error: sErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: "Demo Director",
            supermarket_id: "", 
          }
        }
      });
      if (!sErr) {
        const { error: lErr } = await supabase.auth.signInWithPassword({ email, password });
        error = lErr;
      } else {
        error = sErr;
      }
    }

    // Auto-create Manager demo account on first use if it does not exist in Supabase
    if (error && email === "manager@twimuerp.com" && password === "manager123") {
      const { error: sErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: "Demo Manager",
            supermarket_id: "", // Will be auto-assigned to the first branch in useAuth
          }
        }
      });
      if (!sErr) {
        const { error: lErr } = await supabase.auth.signInWithPassword({ email, password });
        error = lErr;
      } else {
        error = sErr;
      }
    }

    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  }

  async function doSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: sEmail,
      password: sPwd,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: sName,
          supermarket_id: sSm && sSm !== "preset" ? sSm : "",
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — signing you in");
    const { error: e2 } = await supabase.auth.signInWithPassword({ email: sEmail, password: sPwd });
    if (e2) return toast.error(e2.message);
    navigate({ to: "/dashboard" });
  }

  return (
    <div 
      className="min-h-screen relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#FFF5F6] via-white to-[#FFF0F2]"
      style={{
        backgroundImage: 'url("/supermarket-bg.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Light tinted and soft blurred overlay for beautiful readability */}
      <div className="absolute inset-0 bg-[#FFF5F6]/75 backdrop-blur-[4px] z-0"></div>

      {/* Dynamic Background Glowing Blobs */}
      <div className="absolute inset-0 z-0 opacity-50">
        <div 
          className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-40 animate-pulse bg-gradient-to-br from-pink-400 to-rose-300"
        />
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] opacity-35 bg-gradient-to-br from-rose-200 to-pink-100"
        />
        <div 
          className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full blur-[100px] opacity-25 mix-blend-multiply bg-gradient-to-br from-pink-300 to-rose-200"
        />
        {/* Subtle grid pattern with soft pink hue */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(244,63,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(244,63,94,0.03)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]"></div>
      </div>

      {/* Main Content Card Container */}
      <div className="z-10 flex w-full max-w-5xl overflow-hidden rounded-3xl border border-pink-100 bg-white/90 shadow-2xl shadow-pink-200/40 backdrop-blur-xl transition-all duration-500 m-6">
        
        {/* Left Side: Brand & Value Prop in Rich Glassmorphic Pink Gradient */}
        <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden bg-gradient-to-b from-pink-500 via-pink-600 to-rose-700 text-white shadow-xl shadow-pink-100/40 border-0">
          <div className="absolute inset-0 bg-white/5 mix-blend-overlay z-0"></div>
          
          <div className="relative z-10 flex items-center gap-3 text-xl font-bold tracking-tight text-white">
            <div className="p-2 rounded-xl bg-white text-pink-600 shadow-md shadow-pink-900/10">
              <Store className="size-6 text-pink-600" />
            </div>
            Twimu ERP
          </div>
          
          <div className="relative z-10 space-y-6">
            <h1 className="text-4xl leading-tight font-extrabold text-white">
              Run your supermarket chain with clarity.
            </h1>
            <p className="text-lg text-white/80 font-medium leading-relaxed max-w-md">
              Sales, stock, salaries, expenses and analytics — across every branch, in one secure cloud platform.
            </p>
            <div className="flex gap-4 pt-4">
              <div className="flex -space-x-3">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-pink-600 bg-white/20 backdrop-blur-sm flex items-center justify-center text-xs font-semibold text-white">
                    U{i}
                  </div>
                ))}
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-sm font-bold text-white">Trusted by 100+</span>
                <span className="text-xs text-white/80">supermarkets in Uganda</span>
              </div>
            </div>
          </div>
          
          <div className="relative z-10 flex items-center gap-2 text-xs font-semibold text-white/70 uppercase tracking-widest">
            <span>© {new Date().getFullYear()} Twimu ERP</span>
            <span className="w-4 h-[1px] bg-white/30"></span>
            <span>Enterprise Edition</span>
          </div>
        </div>

        {/* Right Side: Auth Forms in Premium White / Soft Pink */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 bg-white/40">
          <div className="max-w-md mx-auto h-full flex flex-col justify-center">
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Welcome back</h2>
              <p className="text-sm text-slate-500">Enter your credentials to access your dashboard.</p>
            </div>

            {/* Subtle Demo Credentials Toggler for safety */}
            <div className="mb-6">
              {!showDemo ? (
                <button
                  type="button"
                  onClick={() => setShowDemo(true)}
                  className="w-full py-2.5 px-4 rounded-xl border border-pink-100/60 bg-pink-50/30 hover:bg-pink-50/60 text-pink-600 hover:text-pink-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-sm shadow-pink-100/5"
                >
                  <span className="size-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                  Show Demo Credentials
                </button>
              ) : (
                <div className="p-4 rounded-2xl bg-pink-50/50 border border-pink-100 shadow-md shadow-pink-100/5 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-pink-500 animate-pulse"></div>
                      <h3 className="text-xs font-bold text-pink-700 uppercase tracking-wider">Demo Accounts</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDemo(false)}
                      className="text-[10px] text-pink-500 hover:text-pink-700 font-bold underline cursor-pointer"
                    >
                      Hide
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Director Demo Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setEmail("admin@twimuerp.com");
                        setPassword("admin123");
                        toast.success("Filled Director (Admin) credentials");
                      }}
                      className={`p-3 rounded-xl border text-left transition-all hover:bg-white active:scale-95 cursor-pointer ${
                        email === "admin@twimuerp.com" 
                          ? "border-pink-400 bg-white shadow-sm shadow-pink-100" 
                          : "border-pink-100/60 bg-white/40 hover:border-pink-200"
                      }`}
                    >
                      <div className="text-xs font-bold text-pink-600 mb-0.5">Director (Admin)</div>
                      <div className="text-[10px] text-slate-700 font-medium truncate">admin@twimuerp.com</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Password: admin123</div>
                    </button>

                    {/* Manager Demo Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setEmail("manager@twimuerp.com");
                        setPassword("manager123");
                        toast.success("Filled Manager credentials");
                      }}
                      className={`p-3 rounded-xl border text-left transition-all hover:bg-white active:scale-95 cursor-pointer ${
                        email === "manager@twimuerp.com" 
                          ? "border-pink-400 bg-white shadow-sm shadow-pink-100" 
                          : "border-pink-100/60 bg-white/40 hover:border-pink-200"
                      }`}
                    >
                      <div className="text-xs font-bold text-rose-500 mb-0.5">Manager (Restricted)</div>
                      <div className="text-[10px] text-slate-700 font-medium truncate">manager@twimuerp.com</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Password: manager123</div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 p-1 bg-pink-50/50 border border-pink-100/50 rounded-xl mb-8">
                <TabsTrigger 
                  value="login" 
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-800 transition-all font-semibold"
                >
                  Sign in
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-800 transition-all font-semibold"
                >
                  Create account
                </TabsTrigger>
              </TabsList>

              <div className="mt-4">
                <TabsContent value="login" className="m-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <form onSubmit={doLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-700 font-semibold">Email address</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        required 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className="bg-white border-pink-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-pink-400/50 h-12 rounded-xl transition-all hover:border-pink-300"
                        placeholder="manager@branch.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-slate-700 font-semibold">Password</Label>
                        <a href="#" className="text-xs text-pink-600 hover:text-pink-700 font-semibold transition-colors">Forgot password?</a>
                      </div>
                      <Input 
                        id="password" 
                        type="password" 
                        required 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="bg-white border-pink-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-pink-400/50 h-12 rounded-xl transition-all hover:border-pink-300"
                        placeholder="••••••••"
                      />
                    </div>
                    <Button 
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold shadow-lg shadow-pink-500/20 transition-all active:scale-[0.98]" 
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="size-5 animate-spin" /> : "Sign in to Dashboard"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="m-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <form onSubmit={doSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold">Full name</Label>
                      <Input 
                        required 
                        value={sName} 
                        onChange={(e) => setSName(e.target.value)}
                        className="bg-white border-pink-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-pink-400/50 h-11 rounded-xl hover:border-pink-300"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold">Email address</Label>
                      <Input 
                        type="email" 
                        required 
                        value={sEmail} 
                        onChange={(e) => setSEmail(e.target.value)}
                        className="bg-white border-pink-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-pink-400/50 h-11 rounded-xl hover:border-pink-300"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold">Password</Label>
                      <Input 
                        type="password" 
                        required 
                        minLength={6} 
                        value={sPwd} 
                        onChange={(e) => setSPwd(e.target.value)}
                        className="bg-white border-pink-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-pink-400/50 h-11 rounded-xl hover:border-pink-300"
                        placeholder="Create a strong password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold">Assign Supermarket Branch</Label>
                      <Select value={sSm} onValueChange={setSSm}>
                        <SelectTrigger className="bg-white border-pink-200 text-slate-800 h-11 rounded-xl focus:ring-pink-400/50 hover:border-pink-300">
                          <SelectValue placeholder="Select your branch" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-pink-100 text-slate-800">
                          {supermarkets.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="hover:bg-pink-50 focus:bg-pink-50 focus:text-pink-700 text-slate-700">{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      className="w-full h-11 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold shadow-lg shadow-pink-500/20 transition-all active:scale-[0.98] mt-2" 
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="size-4 animate-spin" /> : "Create Account"}
                    </Button>
                    <p className="text-[11px] text-center text-slate-400 pt-2 font-medium">
                      New accounts are created as <strong className="text-slate-600 font-semibold">Manager</strong>. A Director must promote you to full privileges.
                    </p>
                  </form>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
