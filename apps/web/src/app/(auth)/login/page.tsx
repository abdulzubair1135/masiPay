'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { UtensilsCrossed, ArrowRight, ChefHat, Phone, Lock } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('redirect') || '/menu';
  const { loginStudent, loginStaff } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'STUDENT' | 'STAFF'>('STUDENT');

  // Student Form - ONLY Mobile Number
  const [phone, setPhone] = useState('');

  // Staff Form
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await loginStudent(phone.trim());
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'Login failed. If first time, please sign up.');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim() || !password.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const staffUser = await loginStaff(emailOrPhone.trim(), password);
      if (staffUser.role === 'SUPER_ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/staff/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid staff credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white mx-auto shadow-xl shadow-orange-500/20 mb-3">
          <UtensilsCrossed className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          {t('appName')}
        </h1>
        <p className="text-xs text-gray-500 font-medium mt-0.5">
          {t('tagline')}
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="bg-gray-100 p-1 rounded-2xl flex items-center mb-6">
        <button
          onClick={() => {
            setActiveTab('STUDENT');
            setError(null);
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'STUDENT'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Phone className="w-4 h-4" />
          <span>Student</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('STAFF');
            setError(null);
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'STAFF'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <ChefHat className="w-4 h-4" />
          <span>Staff / Admin</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 text-rose-700 text-xs font-bold rounded-2xl border border-rose-200 mb-4 text-center">
          {error}
        </div>
      )}

      {activeTab === 'STUDENT' ? (
        /* Student Fast Login - ONLY PHONE NUMBER */
        <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm">
          <form onSubmit={handleStudentLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Enter Your Mobile Number
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-gray-500 font-bold text-sm">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full pl-14 pr-4 py-3 rounded-2xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-base font-bold tracking-wider outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length < 10}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-orange-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <span>{loading ? 'Verifying...' : 'Login with Mobile Number'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-gray-500">
            First time in canteen?{' '}
            <Link href="/register" className="text-orange-600 font-extrabold hover:underline">
              Sign Up with Selfie & Name
            </Link>
          </div>
        </div>
      ) : (
        /* Staff & Admin Login */
        <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm">
          <form onSubmit={handleStaffLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Email or Mobile Number
              </label>
              <input
                type="text"
                required
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder="masi@masicanteen.com / admin@masicanteen.com"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm font-semibold outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm font-semibold outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
            >
              <span>{loading ? 'Authenticating...' : 'Login to Kitchen / Admin'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <div className="mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-tight">
            <strong>Staff Credentials:</strong>
            <br />
            • Masi: <code className="font-bold">masi@masicanteen.com</code> / <code className="font-bold">Masi@12345</code>
            <br />
            • Admin: <code className="font-bold">admin@masicanteen.com</code> / <code className="font-bold">Admin@12345</code>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
