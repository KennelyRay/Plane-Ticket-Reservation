import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { isAxiosError } from 'axios';
import { authApi } from '../../features/auth/api';
import { useAuthStore } from '../../features/auth/store';
import AuthShell from '../../components/layouts/AuthShell';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

const inputClass =
  'w-full h-12 px-3.5 rounded-xl border border-slate-200 bg-white text-[15px] font-medium text-ink placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-400 transition-shadow';

const labelClass = 'block text-[11px] font-bold uppercase tracking-wide text-ink-soft mb-1.5';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const { user, accessToken } = await authApi.login(values);
      setAuth(user, accessToken);
      navigate('/dashboard');
    } catch (err) {
      setServerError(
        isAxiosError(err) ? err.response?.data?.message ?? 'Login failed' : 'Login failed'
      );
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your bookings and check in faster.">
      {serverError && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" {...register('email')} className={inputClass} placeholder="you@example.com" />
          {errors.email && (
            <p className="text-xs font-medium text-red-600 mt-1.5">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>Password</label>
          <input type="password" {...register('password')} className={inputClass} placeholder="••••••••" />
          {errors.password && (
            <p className="text-xs font-medium text-red-600 mt-1.5">{errors.password.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-sm font-medium text-ink-soft mt-7 text-center">
        No account yet?{' '}
        <Link to="/register" className="text-brand-600 font-bold hover:underline">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}
