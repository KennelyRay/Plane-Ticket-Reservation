import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store';

export default function ProtectedRoute({ roles }: { roles?: string[] }) {
  const { user } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <Outlet />;
}
