import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store';
import { authApi } from '../../features/auth/api';
import { LogoMark } from '../ui/icons';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `relative px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
    isActive ? 'text-brand-700 bg-brand-50' : 'text-ink-soft hover:text-ink hover:bg-slate-100'
  }`;

function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <LogoMark className="w-9 h-9 transition-transform group-hover:-rotate-6" />
      <span className="text-[19px] font-extrabold tracking-tight">
        Vertix
        <span className="bg-gradient-to-r from-brand-600 to-violet-glow bg-clip-text text-transparent">
          Flights
        </span>
      </span>
    </Link>
  );
}

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
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Wordmark />
          <nav className="flex items-center gap-1 sm:gap-2">
            <NavLink to="/flights" className={navLinkClass}>
              Flights
            </NavLink>
            {user ? (
              <>
                <NavLink to="/dashboard" className={navLinkClass}>
                  Dashboard
                </NavLink>
                <div className="hidden sm:flex items-center gap-2 ml-2 pl-3 border-l border-slate-200">
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-600 to-violet-glow text-white text-xs font-bold flex items-center justify-center">
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </span>
                  <span className="text-sm font-semibold text-ink leading-tight">
                    {user.firstName}
                    <span className="block text-[11px] font-medium text-ink-soft capitalize">
                      {user.role.toLowerCase().replace(/_/g, ' ')}
                    </span>
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-ink-soft border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>
                  Login
                </NavLink>
                <Link
                  to="/register"
                  className="ml-1 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:opacity-90 transition-opacity"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200/70 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LogoMark className="w-7 h-7" />
            <span className="text-sm font-bold">
              Vertix<span className="text-brand-600">Flights</span>
            </span>
          </div>
          <p className="text-xs text-ink-soft">
            © {new Date().getFullYear()} VertixFlights. Fly smarter, book faster.
          </p>
          <div className="flex items-center gap-4 text-xs font-medium text-ink-soft">
            <span>Support</span>
            <span>Privacy</span>
            <span>Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
