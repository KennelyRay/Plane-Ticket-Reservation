import { Link } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store';
import { CheckInIcon, SearchIcon, TicketIcon } from '../../components/ui/icons';

const today = new Date().toLocaleDateString([], {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);

  const cards = [
    {
      to: '/flights',
      icon: SearchIcon,
      title: 'Search flights',
      text: 'Find and book your next trip',
      live: true,
      gradient: 'from-brand-600 to-violet-glow',
    },
    {
      to: '/bookings',
      icon: TicketIcon,
      title: 'My bookings',
      text: 'Tickets, receipts and trip history',
      live: true,
      gradient: 'from-sky-500 to-brand-600',
    },
    {
      icon: CheckInIcon,
      title: 'Online check-in',
      text: 'Skip the counter, get your boarding pass',
      live: false,
      gradient: 'from-violet-glow to-fuchsia-500',
    },
  ];

  return (
    <div className="animate-fade-up">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-ink-soft mb-2">{today}</p>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
        Hello,{' '}
        <span className="bg-gradient-to-r from-brand-600 to-violet-glow bg-clip-text text-transparent">
          {user?.firstName}
        </span>{' '}
        👋
      </h1>
      <p className="text-ink-soft font-medium mt-2 mb-10">
        Signed in as <span className="font-bold text-ink">{user?.email}</span>
        <span className="ml-2 inline-flex px-2 py-0.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-[11px] font-bold capitalize">
          {user?.role.toLowerCase().replace(/_/g, ' ')}
        </span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(({ to, icon: Icon, title, text, live, gradient }) => {
          const inner = (
            <>
              <span
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center mb-4 ${
                  live ? 'group-hover:scale-110 transition-transform' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </span>
              <p className="font-extrabold text-ink flex items-center gap-2">
                {title}
                {!live && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-ink-soft text-[10px] font-bold uppercase tracking-wide">
                    Soon
                  </span>
                )}
              </p>
              <p className="text-sm font-medium text-ink-soft mt-1">{text}</p>
            </>
          );

          return live && to ? (
            <Link
              key={title}
              to={to}
              className="group bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 hover:shadow-lift hover:border-brand-200 hover:-translate-y-0.5 transition-all duration-300"
            >
              {inner}
            </Link>
          ) : (
            <div
              key={title}
              className="bg-white/60 rounded-2xl border border-slate-200/60 p-6 opacity-70"
            >
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
