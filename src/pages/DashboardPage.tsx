import { useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Loader2, RefreshCw, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StudentDashboard from './StudentDashboard';

export default function DashboardPage() {
  const { user, role, roleStatus, loading, retryRoleResolution, signOut } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Programmatic redirect for admin/teacher
  useEffect(() => {
    if (loading || !user || roleStatus !== 'ready') return;
    if (role === 'admin') navigate('/admin', { replace: true });
    else if (role === 'teacher') navigate('/teacher', { replace: true });
  }, [loading, user, role, roleStatus, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Role still loading
  if (roleStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Role fetch failed — recovery UI
  if (roleStatus === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center">
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

  // Deterministic routing
  if (role === 'admin') return <Navigate to="/admin" replace />;
  if (role === 'teacher') return <Navigate to="/teacher" replace />;
  if (role === 'student') return <StudentDashboard />;

  // Fallback (should not happen)
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
