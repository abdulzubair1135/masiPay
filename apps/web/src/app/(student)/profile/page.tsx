'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { LanguageModal } from '../../../components/LanguageModal';
import { SelfieCamera } from '../../../components/SelfieCamera';
import { api } from '../../../lib/api';
import {
  User,
  Globe,
  Clock,
  LogOut,
  Shield,
  ChefHat,
  ChevronRight,
  Phone,
  Edit3,
  Camera,
  Save,
  X,
  CheckCircle2,
} from 'lucide-react';

export default function StudentProfilePage() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const { t, language } = useLanguage();
  const [langModalOpen, setLangModalOpen] = useState(false);

  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editImage, setEditImage] = useState(user?.profileImage || '');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <User className="w-16 h-16 text-gray-300 mx-auto mb-3" />
        <h2 className="text-xl font-extrabold text-gray-900">Student Profile</h2>
        <p className="text-xs text-gray-500 mb-6">Login to manage your profile and view your past canteen bills.</p>
        <Link
          href="/login"
          className="bg-orange-600 text-white font-bold px-6 py-3 rounded-2xl shadow-md inline-block text-xs"
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    try {
      setSaving(true);
      setSuccessMsg('');
      const res = await api.patch('/auth/profile', {
        name: editName.trim(),
        profileImage: editImage || user.profileImage,
      });

      const updated = res.data.data.user;
      updateUser({
        name: updated.name,
        profileImage: updated.profileImage,
      });

      setSuccessMsg(language === 'hi' ? 'प्रोफ़ाइल सफलतापूर्वक अपडेट हो गई!' : 'Profile updated successfully!');
      setTimeout(() => {
        setIsEditing(false);
        setSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getLanguageLabel = () => {
    if (language === 'hi') return 'हिन्दी (Hindi)';
    if (language === 'gu') return 'ગુજરાતી (Gujarati)';
    return 'English';
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-20">
      <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-4">
        {t('profile')}
      </h1>

      {successMsg && (
        <div className="mb-4 p-3.5 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* User Card */}
      <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm mb-4 text-center relative overflow-hidden">
        <div className="relative w-24 h-24 mx-auto mb-3">
          <img
            src={user.profileImage || 'https://api.dicebear.com/7.x/bottts/svg?seed=student'}
            alt={user.name}
            className="w-full h-full rounded-full border-4 border-orange-500 object-cover shadow-md"
          />
          <button
            onClick={() => {
              setEditName(user.name);
              setEditImage(user.profileImage || '');
              setIsEditing(true);
            }}
            className="absolute bottom-0 right-0 bg-orange-600 text-white p-1.5 rounded-full shadow-lg hover:bg-orange-700 transition"
            title="Edit Photo"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        <h2 className="text-xl font-extrabold text-gray-900">{user.name}</h2>
        <div className="text-xs font-bold text-orange-600 flex items-center justify-center gap-1 mt-1">
          <Phone className="w-3.5 h-3.5" />
          <span>+91 {user.phone || 'No phone'}</span>
        </div>

        <button
          onClick={() => {
            setEditName(user.name);
            setEditImage(user.profileImage || '');
            setIsEditing(true);
          }}
          className="mt-3 inline-flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-black px-4 py-1.5 rounded-full border border-orange-200 transition active:scale-95"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{language === 'hi' ? 'नाम और फोटो बदलें' : 'Edit Profile & Selfie'}</span>
        </button>
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
        className="w-full flex items-center justify-center gap-2 p-4 rounded-3xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-extrabold text-xs transition active:scale-98"
      >
        <LogOut className="w-4 h-4" />
        <span>Logout Account</span>
      </button>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-orange-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="font-black text-lg text-gray-900">
                {language === 'hi' ? 'प्रोफ़ाइल और फ़ोटो संपादित करें' : 'Edit Profile & Selfie'}
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Selfie Camera Update */}
              <div className="text-center pb-2">
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  📸 Change Selfie Photo (Live Camera / Upload)
                </label>
                <SelfieCamera onCapture={(img) => setEditImage(img)} initialImage={editImage} />
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm font-semibold outline-hidden"
                />
              </div>

              {/* Phone (Readonly) */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">
                  Mobile Number (Registered)
                </label>
                <input
                  type="text"
                  disabled
                  value={`+91 ${user.phone || ''}`}
                  className="w-full px-4 py-3 rounded-2xl bg-gray-100 border border-gray-200 text-sm font-semibold text-gray-500 cursor-not-allowed"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3.5 rounded-2xl font-extrabold text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !editName.trim()}
                  className="flex-1 py-3.5 rounded-2xl font-extrabold text-xs text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 shadow-lg shadow-orange-600/20 transition flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <LanguageModal isOpen={langModalOpen} onClose={() => setLangModalOpen(false)} />
    </div>
  );
}
