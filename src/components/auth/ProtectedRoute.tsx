import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Loader2, RefreshCw, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'teacher' | 'student';
  allowedRoles?: ('admin' | 'teacher' | 'student')[];
}

export function ProtectedRoute({
  children,
  requiredRole,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, role, roleStatus, loading, retryRoleResolution, signOut } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  const needsRoleCheck = !!(requiredRole || (allowedRoles && allowedRoles.length > 0));

  // Still loading auth session
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Auth-only route (no role check needed) — render immediately
  if (!needsRoleCheck) {
    return <>{children}</>;
  }

  // Role-specific route: check roleStatus
  if (roleStatus === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Role fetch failed — show recovery UI
  if (roleStatus === 'error') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-muted-foreground">
            {t('common.roleLoadError', 'Er ging iets mis bij het laden van je rol. Probeer het opnieuw.')}
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={retryRoleResolution} variant="default" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.retry', 'Opnieuw proberen')}
            </Button>
            <Button onClick={signOut} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              {t('auth.logout', 'Uitloggen')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Role resolved — check authorization
  if (requiredRole && role !== requiredRole) {
    if (role !== 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!role || !allowedRoles.includes(role)) {
      if (role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  return <>{children}</>;
}
