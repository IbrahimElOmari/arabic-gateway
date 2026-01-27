import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

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
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has required role
  if (requiredRole && role !== requiredRole) {
    // Admin has access to everything
    if (role !== 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Check if user's role is in allowed roles
  if (allowedRoles && allowedRoles.length > 0) {
    if (!role || !allowedRoles.includes(role)) {
      // Admin has access to everything
      if (role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  return <>{children}</>;
}
