import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { roleLabel } from '@/lib/authorization';

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: string;
  requireRoles?: string[];
  requireSchoolRole?: string;
  requireSchoolRoles?: string[];
}

export const ProtectedRoute = ({
  children,
  requireRole,
  requireRoles,
  requireSchoolRole,
  requireSchoolRoles,
}: ProtectedRouteProps) => {
  const { user, loading, authorizationLoading, hasRole, hasAnyRole, hasSchoolRole, hasAnySchoolRole } = useAuth();
  const location = useLocation();

  if (loading || authorizationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5" role="status" aria-live="polite">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Checking your access…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  const roleAllowed = requireRole ? hasRole(requireRole) : requireRoles?.length ? hasAnyRole(requireRoles) : true;
  const schoolRoleAllowed = requireSchoolRole
    ? hasSchoolRole(requireSchoolRole)
    : requireSchoolRoles?.length
      ? hasAnySchoolRole(requireSchoolRoles)
      : true;

  if (!roleAllowed || !schoolRoleAllowed) {
    const required = requireRole ?? requireRoles?.[0] ?? requireSchoolRole ?? requireSchoolRoles?.[0] ?? 'authorized user';
    return <Navigate to="/dashboard" replace state={{ denied: true, from: location.pathname, required: roleLabel(required) }} />;
  }

  return <>{children}</>;
};
