import { useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import StudentDashboard from './StudentDashboard';

export default function DashboardPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  // Backup programmatic redirect
  useEffect(() => {
    if (loading || !user || role === null) return;
    if (role === 'admin') navigate('/admin', { replace: true });
    else if (role === 'teacher') navigate('/teacher', { replace: true });
  }, [loading, user, role, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && role === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  if (role === 'teacher') return <Navigate to="/teacher" replace />;
  if (role === 'student') return <StudentDashboard />;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
