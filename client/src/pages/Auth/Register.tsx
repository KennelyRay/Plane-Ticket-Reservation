import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { isAxiosError } from 'axios';
import { authApi } from '../../features/auth/api';
import { useAuthStore } from '../../features/auth/store';

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
  'w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500';

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
        isAxiosError(err) ? err.response?.data?.message ?? 'Registration failed' : 'Registration failed'
      );
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Create your account</h1>
        <p className="text-sm text-slate-500 mb-6">Book flights in minutes</p>

        {serverError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{serverError}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First name</label>
              <input {...register('firstName')} className={inputClass} placeholder="Juan" />
              {errors.firstName && (
                <p className="text-xs text-red-600 mt-1">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last name</label>
              <input {...register('lastName')} className={inputClass} placeholder="dela Cruz" />
              {errors.lastName && (
                <p className="text-xs text-red-600 mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" {...register('email')} className={inputClass} placeholder="you@example.com" />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input type="password" {...register('password')} className={inputClass} placeholder="••••••••" />
            {errors.password && (
              <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm password</label>
            <input type="password" {...register('confirmPassword')} className={inputClass} placeholder="••••••••" />
            {errors.confirmPassword && (
              <p className="text-xs text-red-600 mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium disabled:opacity-50"
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-slate-500 mt-6 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-sky-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
