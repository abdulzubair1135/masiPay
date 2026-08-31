'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import { useCart } from '../../../../context/CartContext';
import { useAuth } from '../../../../context/AuthContext';
import { useLanguage } from '../../../../context/LanguageContext';
import { SelfieCamera } from '../../../../components/SelfieCamera';
import { MapPin, AlertCircle, ArrowRight } from 'lucide-react';

export default function TableLandingPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  const { setTable } = useCart();
  const { user, registerStudent } = useAuth();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any>(null);

  // Student onboarding form (Name + Phone + Selfie)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selfieImage, setSelfieImage] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function resolveTable() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/tables/token/${token}`);
        const tbl = res.data.data;
        setTableData(tbl);
        setTable({
          tableId: tbl._id,
          tableNumber: tbl.tableNumber,
          secureToken: tbl.secureToken,
        });
      } catch (err: any) {
        setError(err.message || 'Invalid or disabled table QR code');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      resolveTable();
    }
  }, [token]);

  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || phone.length < 10) return;

    try {
      setSubmitting(true);
      await registerStudent({
        name: name.trim(),
        phone: phone.trim(),
        profileImage: selfieImage || undefined,
        language: 'en',
      });
      router.push('/menu');
    } catch (err: any) {
      alert(err.message || 'Failed to continue');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueToMenu = () => {
    router.push('/menu');
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
        <h2 className="mt-4 font-bold text-lg text-gray-800">Verifying Table QR...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-gray-900 mb-2">QR Code Error</h2>
        <p className="text-sm text-gray-600 mb-6">{error}</p>
        <button
          onClick={() => router.push('/menu')}
          className="bg-orange-600 text-white font-bold px-6 py-3 rounded-2xl shadow-md hover:bg-orange-700 transition"
        >
          Go to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      {/* Table Verified Banner */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl p-6 text-white text-center shadow-xl shadow-orange-500/20 mb-6 relative overflow-hidden">
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
          <MapPin className="w-4 h-4" />
          <span>Table Locked</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mt-1">
          {t('table')} {tableData?.tableNumber}
        </h1>
        <p className="text-orange-100 text-xs mt-1">
          Capacity: {tableData?.capacity} Persons
        </p>
      </div>

      {user ? (
        /* Logged In Flow */
        <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm text-center">
          <div className="w-20 h-20 rounded-full border-2 border-orange-400 mx-auto overflow-hidden mb-3">
            <img
              src={user.profileImage}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-sm text-gray-500 font-medium">{t('welcome')}</div>
          <h2 className="text-xl font-extrabold text-gray-900">{user.name}</h2>
          <div className="text-xs text-orange-600 font-bold mt-0.5">
            {user.phone}
          </div>

          <button
            onClick={handleContinueToMenu}
            className="w-full mt-6 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-orange-600/30 transition-all active:scale-[0.98]"
          >
            <span>View Food Menu</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      ) : (
        /* First-Time Student Form: Selfie + Name + Phone ONLY */
        <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm">
          <div className="text-center mb-4">
            <h2 className="font-extrabold text-lg text-gray-900">Welcome to MasiCanteen 👋</h2>
            <p className="text-xs text-gray-500">Quick 10-second setup to order food</p>
          </div>

          <form onSubmit={handleQuickRegister} className="space-y-4">
            {/* Selfie Photo */}
            <div className="text-center pb-2">
              <label className="block text-xs font-bold text-gray-700 mb-2">
                📸 Take a quick Selfie
              </label>
              <SelfieCamera onCapture={(img) => setSelfieImage(img)} initialImage={selfieImage} />
            </div>

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
              disabled={submitting || phone.length < 10 || !name.trim()}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-orange-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <span>{submitting ? 'Starting...' : 'Continue to Menu'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
