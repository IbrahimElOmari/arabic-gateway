import { useState, useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { TeacherSidebar } from "./TeacherSidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import TranslatedErrorBoundary from "@/components/TranslatedErrorBoundary";

export function TeacherLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, role, loading, refreshProfile } = useAuth();
  const { t } = useTranslation();
  const roleChecked = useRef(false);
  const [roleTimeout, setRoleTimeout] = useState(false);

  useEffect(() => {
    if (role !== null) roleChecked.current = true;
  }, [role]);

  useEffect(() => {
    if (role !== null) return;
    const timer = setTimeout(() => setRoleTimeout(true), 15000);
    return () => clearTimeout(timer);
  }, [role, loading]);

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
    // Role check timed out
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{t('auth.roleLoadFailed', 'Rol kon niet geladen worden.')}</p>
        <Button onClick={() => { setRoleTimeout(false); refreshProfile(); }} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.retry', 'Opnieuw proberen')}
        </Button>
      </div>
    );
  }

  if (role !== "teacher" && role !== "admin") {
    // Redirect: unauthorized role
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
          sidebarCollapsed ? "ms-16" : "ms-64"
        )}
      >
        <div className="container py-6">
          <TranslatedErrorBoundary>
            <Outlet />
          </TranslatedErrorBoundary>
        </div>
      </main>
    </div>
  );
}
