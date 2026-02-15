import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import StudentDashboard from './StudentDashboard';

/**
 * DashboardPage with synchronous role-based routing guards.
 * Uses <Navigate> components instead of useEffect to prevent
 * any frame where StudentDashboard renders for non-students.
 */
export default function DashboardPage() {
  const { user, role, loading, isAdmin, isTeacher } = useAuth();

  console.log('[DashboardPage] render:', { loading, user: !!user, role, isAdmin, isTeacher });

  // Guard 1: Still loading auth state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Guard 2: User exists but role not yet fetched
  if (user && role === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Guard 3: No user → login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Guard 4: Admin → /admin (synchronous, no useEffect delay)
  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Guard 5: Teacher → /teacher
  if (role === 'teacher') {
    return <Navigate to="/teacher" replace />;
  }

  // Guard 6: Only students see StudentDashboard
  if (role === 'student') {
    return <StudentDashboard />;
  }

  // Fallback: unknown role
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
