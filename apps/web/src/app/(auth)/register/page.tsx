'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { SelfieCamera } from '../../../components/SelfieCamera';
import { ArrowRight, UserPlus, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { registerStudent } = useAuth();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selfieImage, setSelfieImage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || phone.length < 10) return;

    if (!selfieImage || selfieImage.trim().length === 0) {
      setError('📸 Live Selfie Photo is Compulsory! Please snap a photo using your camera.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await registerStudent({
        name: name.trim(),
        phone: phone.trim(),
        profileImage: selfieImage,
        language: 'en',
      });
      router.push('/menu');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-orange-500/20 mb-2">
          <UserPlus className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Quick Student Signup
        </h1>
        <p className="text-xs text-gray-500">Snap a compulsory selfie and enter your name to start ordering</p>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 text-rose-700 text-xs font-bold rounded-2xl border border-rose-200 mb-4 text-center flex items-center justify-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selfie Photo (Compulsory) */}
          <div className="text-center pb-2">
            <label className="block text-xs font-black text-gray-800 mb-2">
              📸 Student Selfie <span className="text-rose-600 font-extrabold">* (COMPULSORY)</span>
            </label>
            <SelfieCamera onCapture={(img) => {
              setSelfieImage(img);
              if (img) setError(null);
            }} initialImage={selfieImage} />
            {!selfieImage && (
              <p className="text-[11px] font-bold text-amber-600 mt-2">
                ⚠️ Click camera icon above to snap photo before continuing
              </p>
            )}
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Your Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Abdul Zubair"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm font-semibold outline-hidden"
            />
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Mobile Number (10 digits) *
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
                className="w-full pl-14 pr-4 py-3 rounded-2xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm font-semibold outline-hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || phone.length < 10 || !name.trim() || !selfieImage}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-orange-600/30 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>{loading ? 'Creating Profile...' : !selfieImage ? '📸 Snap Selfie to Continue' : 'Continue to Menu'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-orange-600 font-extrabold hover:underline">
            Login with Mobile No.
          </Link>
        </div>
      </div>
    </div>
  );
}
