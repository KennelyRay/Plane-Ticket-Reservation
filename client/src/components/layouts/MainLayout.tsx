import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store';
import { authApi } from '../../features/auth/api';

export default function MainLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-sky-700">
            ✈️ VertixFlights
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link to="/flights" className="hover:text-sky-700">Flights</Link>
            {user ? (
              <>
                <Link to="/dashboard" className="hover:text-sky-700">Dashboard</Link>
                <span className="text-slate-400 hidden sm:inline">
                  {user.firstName} ({user.role})
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-sky-700">Login</Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
