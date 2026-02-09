import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * DashboardRouter redirects users based on their role:
 * - Admin → /admin
 * - Teacher → /teacher
 * - Student → stays on student dashboard
 */
export default function DashboardRouter() {
  const { user, role, loading, isAdmin, isTeacher } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait until we have both user and role loaded
    if (loading || (user && role === null)) {
      return;
    }

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    // Redirect based on role
    if (isAdmin) {
      navigate('/admin', { replace: true });
    } else if (isTeacher) {
      navigate('/teacher', { replace: true });
    }
    // Students stay on this page - we'll render the student dashboard
  }, [user, role, loading, isAdmin, isTeacher, navigate]);

  // Show loader while determining where to redirect
  if (loading || (user && role === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // For students (or while redirect is happening), render nothing
  // The actual StudentDashboard will be imported lazily
  return null;
}
