import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Store, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF5F6] via-white to-[#FFF0F2] flex flex-col items-center justify-center p-4">
        <div className="animate-pulse flex flex-col items-center gap-6">
          <div className="p-4 rounded-3xl bg-white shadow-xl shadow-pink-100/50">
            <Store className="size-12 text-pink-500" />
          </div>
          <div className="space-y-3 text-center">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Twimu Information Management System</h1>
            <div className="flex items-center justify-center gap-2 text-pink-600 font-medium text-sm">
              <Loader2 className="size-4 animate-spin" /> Securing connection...
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
