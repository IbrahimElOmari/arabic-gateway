import { useState, useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, role, loading, refreshProfile } = useAuth();
  const roleChecked = useRef(false);
  const [roleTimeout, setRoleTimeout] = useState(false);

  useEffect(() => {
    if (role !== null) roleChecked.current = true;
  }, [role]);

  useEffect(() => {
    const timer = setTimeout(() => setRoleTimeout(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Still loading auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role is null: either still loading or failed
  if (role === null) {
    if (!roleTimeout) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    // Timeout reached - show error with retry
    console.warn('[AdminLayout] Role check timed out - role is still null after 5s');
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Rol kon niet geladen worden.</p>
        <Button onClick={() => { setRoleTimeout(false); refreshProfile(); }} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Opnieuw proberen
        </Button>
      </div>
    );
  }

  // Role loaded but not admin - only redirect if role was actually checked
  if (role !== "admin") {
    console.warn(`[AdminLayout] Redirecting: role="${role}" is not admin`);
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <main
        className={cn(
          "min-h-screen transition-all duration-300",
          sidebarCollapsed ? "ml-16" : "ml-64"
        )}
      >
        <div className="container py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
