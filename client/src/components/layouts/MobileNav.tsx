import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import type { User } from '../../types';
import {
  CheckInIcon,
  GridIcon,
  HomeIcon,
  LogoutIcon,
  SearchIcon,
  TicketIcon,
  UserIcon,
} from '../ui/icons';

interface TabDef {
  to: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactElement;
  end?: boolean;
}

const GUEST_TABS: TabDef[] = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/flights', label: 'Flights', icon: SearchIcon },
  { to: '/login', label: 'Sign in', icon: UserIcon },
];

const CUSTOMER_TABS: TabDef[] = [
  { to: '/dashboard', label: 'Home', icon: HomeIcon },
  { to: '/flights', label: 'Flights', icon: SearchIcon },
  { to: '/bookings', label: 'Trips', icon: TicketIcon },
  { to: '/check-in', label: 'Check-in', icon: CheckInIcon },
];

const ADMIN_TABS: TabDef[] = [{ to: '/admin', label: 'Dashboard', icon: GridIcon }];

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 h-full px-1 text-[10px] font-bold transition-colors ${
    isActive ? 'text-brand-700' : 'text-ink-soft'
  }`;

/**
 * App-style bottom navigation shown only on phones (hidden from `sm` up, where
 * the header nav takes over). Signed-in users also get an account sheet with
 * their identity and a logout action.
 */
export default function MobileNav({
  user,
  onLogout,
}: {
  user: User | null;
  onLogout: () => void;
}) {
  const [accountOpen, setAccountOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const tabs = !user ? GUEST_TABS : isAdmin ? ADMIN_TABS : CUSTOMER_TABS;

  return (
    <>
      <nav
        className="sm:hidden fixed inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        <div className="flex items-stretch h-16">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={tabClass}>
              {({ isActive }) => (
                <>
                  <span
                    className={`flex items-center justify-center w-10 h-7 rounded-full transition-colors ${
                      isActive ? 'bg-brand-50' : ''
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                  </span>
                  <span className="truncate max-w-full">{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {user && (
            <button
              onClick={() => setAccountOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 h-full px-1 text-[10px] font-bold text-ink-soft"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-brand-600 to-violet-glow text-white text-[10px] font-bold">
                {user.firstName[0]}
                {user.lastName[0]}
              </span>
              <span className="truncate max-w-full">Account</span>
            </button>
          )}
        </div>
      </nav>

      {/* Account sheet */}
      {user && accountOpen && (
        <div
          className="sm:hidden fixed inset-0 z-40 flex items-end bg-ink/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setAccountOpen(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl border-t border-slate-200 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />
            <div className="flex items-center gap-3 mb-5">
              <span className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-600 to-violet-glow text-white text-sm font-bold flex items-center justify-center shrink-0">
                {user.firstName[0]}
                {user.lastName[0]}
              </span>
              <div className="min-w-0">
                <p className="font-extrabold text-ink truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs font-medium text-ink-soft truncate">{user.email}</p>
                <span className="mt-1 inline-flex px-2 py-0.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-[10px] font-bold capitalize">
                  {user.role.toLowerCase().replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {!isAdmin && (
              <Link
                to="/dashboard"
                onClick={() => setAccountOpen(false)}
                className="flex items-center gap-3 w-full h-12 px-3 rounded-xl text-sm font-bold text-ink hover:bg-slate-50 transition-colors"
              >
                <HomeIcon className="w-5 h-5 text-ink-soft" />
                My dashboard
              </Link>
            )}

            <button
              onClick={() => {
                setAccountOpen(false);
                onLogout();
              }}
              className="flex items-center gap-3 w-full h-12 px-3 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogoutIcon className="w-5 h-5" />
              Log out
            </button>

            <button
              onClick={() => setAccountOpen(false)}
              className="mt-2 w-full h-11 rounded-xl text-sm font-bold text-ink-soft border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
