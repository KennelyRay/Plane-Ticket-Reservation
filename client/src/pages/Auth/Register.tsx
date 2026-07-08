import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { isAxiosError } from 'axios';
import { authApi } from '../../features/auth/api';
import { useAuthStore } from '../../features/auth/store';
import AuthShell from '../../components/layouts/AuthShell';

const schema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

type FormValues = z.infer<typeof schema>;

const inputClass =
  'w-full h-12 px-3.5 rounded-xl border border-slate-200 bg-white text-[15px] font-medium text-ink placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-400 transition-shadow';

const labelClass = 'block text-[11px] font-bold uppercase tracking-wide text-ink-soft mb-1.5';

export default function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ confirmPassword: _confirmPassword, ...values }: FormValues) => {
    setServerError(null);
    try {
      const { user, accessToken } = await authApi.register(values);
      setAuth(user, accessToken);
      navigate('/dashboard');
    } catch (err) {
      setServerError(
        isAxiosError(err)
          ? err.response?.data?.message ?? 'Registration failed'
          : 'Registration failed'
      );
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Book flights in minutes — no fees, no fuss.">
      {serverError && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>First name</label>
            <input {...register('firstName')} className={inputClass} placeholder="Juan" />
            {errors.firstName && (
              <p className="text-xs font-medium text-red-600 mt-1.5">{errors.firstName.message}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Last name</label>
            <input {...register('lastName')} className={inputClass} placeholder="dela Cruz" />
            {errors.lastName && (
              <p className="text-xs font-medium text-red-600 mt-1.5">{errors.lastName.message}</p>
            )}
          </div>
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" {...register('email')} className={inputClass} placeholder="you@example.com" />
          {errors.email && (
            <p className="text-xs font-medium text-red-600 mt-1.5">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>Password</label>
          <input type="password" {...register('password')} className={inputClass} placeholder="Minimum 8 characters" />
          {errors.password && (
            <p className="text-xs font-medium text-red-600 mt-1.5">{errors.password.message}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>Confirm password</label>
          <input type="password" {...register('confirmPassword')} className={inputClass} placeholder="Repeat your password" />
          {errors.confirmPassword && (
            <p className="text-xs font-medium text-red-600 mt-1.5">{errors.confirmPassword.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-sm font-medium text-ink-soft mt-7 text-center">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-600 font-bold hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
