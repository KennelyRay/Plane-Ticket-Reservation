import { Link } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store';

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 mb-2">
        Hello, {user?.firstName} 👋
      </h1>
      <p className="text-slate-500 mb-8">
        Signed in as <span className="font-medium">{user?.email}</span> ({user?.role})
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/flights"
          className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="text-3xl mb-2">🔍</div>
          <div className="font-semibold text-slate-800">Search flights</div>
          <div className="text-sm text-slate-500">Find and book your next trip</div>
        </Link>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 opacity-60">
          <div className="text-3xl mb-2">🎫</div>
          <div className="font-semibold text-slate-800">My bookings</div>
          <div className="text-sm text-slate-500">Coming soon</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 opacity-60">
          <div className="text-3xl mb-2">🛂</div>
          <div className="font-semibold text-slate-800">Online check-in</div>
          <div className="text-sm text-slate-500">Coming soon</div>
        </div>
      </div>
    </div>
  );
}
