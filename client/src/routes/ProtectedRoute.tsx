import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store';

export default function ProtectedRoute({
  roles,
  denyRoles,
  allowGuests,
}: {
  roles?: string[];
  denyRoles?: string[];
  allowGuests?: boolean;
}) {
  const { user } = useAuthStore();

  if (!user) return allowGuests ? <Outlet /> : <Navigate to="/login" replace />;

  const blocked =
    (roles && !roles.includes(user.role)) || (denyRoles && denyRoles.includes(user.role));
  if (blocked) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/'} replace />;

  return <Outlet />;
}
