import { useState, useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { TeacherSidebar } from "./TeacherSidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TeacherLayout() {
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

  if (role === null) {
    if (!roleTimeout) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    console.warn('[TeacherLayout] Role check timed out - role is still null after 5s');
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

  if (role !== "teacher" && role !== "admin") {
    console.warn(`[TeacherLayout] Redirecting: role="${role}" is not teacher/admin`);
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <TeacherSidebar
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
