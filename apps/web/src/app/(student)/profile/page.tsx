'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { LanguageModal } from '../../../components/LanguageModal';
import {
  User,
  Globe,
  Clock,
  Heart,
  LogOut,
  Shield,
  ChefHat,
  ChevronRight,
  Phone,
} from 'lucide-react';

export default function StudentProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t, language } = useLanguage();
  const [langModalOpen, setLangModalOpen] = useState(false);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <User className="w-16 h-16 text-gray-300 mx-auto mb-3" />
        <h2 className="text-xl font-extrabold text-gray-900">Student Profile</h2>
        <p className="text-xs text-gray-500 mb-6">Login to manage your profile and view your past canteen bills.</p>
        <Link
          href="/login"
          className="bg-orange-600 text-white font-bold px-6 py-3 rounded-2xl shadow-md inline-block"
        >
          Login
        </Link>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getLanguageLabel = () => {
    if (language === 'hi') return 'हिन्दी (Hindi)';
    if (language === 'gu') return 'ગુજરાતી (Gujarati)';
    return 'English';
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-12">
      <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-4">
        {t('profile')}
      </h1>

      {/* User Card */}
      <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm mb-4 text-center">
        <div className="relative w-24 h-24 mx-auto mb-3">
          <img
            src={user.profileImage || 'https://api.dicebear.com/7.x/bottts/svg?seed=student'}
            alt={user.name}
            className="w-full h-full rounded-full border-4 border-orange-500 object-cover shadow-md"
          />
          <div className="absolute -bottom-1 -right-1 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            {user.role}
          </div>
        </div>

        <h2 className="text-xl font-extrabold text-gray-900">{user.name}</h2>
        <div className="text-xs font-bold text-orange-600 flex items-center justify-center gap-1 mt-1">
          <Phone className="w-3.5 h-3.5" />
          <span>+91 {user.phone || 'No phone'}</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="bg-white rounded-3xl border border-orange-100 shadow-sm divide-y divide-gray-100 overflow-hidden mb-4">
        <Link
          href="/orders"
          className="flex items-center justify-between p-4 hover:bg-orange-50/50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm text-gray-800">{t('myOrders')}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </Link>

        <Link
          href="/invite"
          className="flex items-center justify-between p-4 hover:bg-orange-50/50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm text-gray-800">
              {language === 'hi' ? 'दोस्तों को इनवाइट करें / QR शेयर' : 'Invite Friends / Share QR'}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </Link>

        <button
          onClick={() => setLangModalOpen(true)}
          className="w-full flex items-center justify-between p-4 hover:bg-orange-50/50 transition text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-gray-800">{t('language')}</div>
              <div className="text-[11px] text-gray-500 font-medium">{getLanguageLabel()}</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Staff & Admin switch portals */}
      <div className="bg-white rounded-3xl border border-orange-100 shadow-sm divide-y divide-gray-100 overflow-hidden mb-4">
        <Link
          href="/staff/dashboard"
          className="flex items-center justify-between p-4 hover:bg-orange-50/50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <ChefHat className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-gray-800">{t('staffLogin')}</div>
              <div className="text-[11px] text-gray-500">Masi Kitchen Order Screen</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </Link>

        <Link
          href="/admin/dashboard"
          className="flex items-center justify-between p-4 hover:bg-orange-50/50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-gray-800">{t('adminLogin')}</div>
              <div className="text-[11px] text-gray-500">College Administration Portal</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </Link>
      </div>

      {/* Logout button */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-4 rounded-3xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-extrabold text-xs transition"
      >
        <LogOut className="w-4 h-4" />
        <span>Logout Account</span>
      </button>

      <LanguageModal isOpen={langModalOpen} onClose={() => setLangModalOpen(false)} />
    </div>
  );
}
