'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { Settings, Save, CheckCircle, Smartphone } from 'lucide-react';

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<any>({
    canteenName: 'MasiCanteen',
    tagline: 'Order karo, Masi tak turant pahunchao.',
    upiId: 'canteen@upi',
    upiPayeeName: 'Masi Canteen Services',
    currencySymbol: '₹',
    defaultLanguage: 'en',
    estimatedPrepTimeMin: 10,
    warningTimeThresholdMin: 10,
    lateTimeThresholdMin: 20,
    allowStudentCancel: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await api.get('/admin/settings');
        setSettings(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSavedSuccess(false);
      await api.patch('/admin/settings', settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      <header className="bg-gray-900 text-white px-4 py-3 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="text-xs font-bold text-gray-400 hover:text-white">
              ← Dashboard
            </Link>
            <h1 className="font-black text-lg">Canteen System Settings</h1>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {savedSuccess && (
          <div className="mb-4 p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2 font-bold text-xs">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Settings saved and updated across all systems!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-base font-extrabold text-gray-900 border-b pb-2">
            1. Canteen Identity & Branding
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Canteen App Name</label>
              <input
                type="text"
                value={settings.canteenName}
                onChange={(e) => setSettings({ ...settings, canteenName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Tagline</label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border text-sm font-semibold"
              />
            </div>
          </div>

          <h2 className="text-base font-extrabold text-gray-900 border-b pb-2 pt-4">
            2. Payment & UPI Configuration
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Canteen UPI ID (VPA)</label>
              <input
                type="text"
                value={settings.upiId}
                onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                placeholder="canteen@upi"
                className="w-full px-4 py-2.5 rounded-xl border text-sm font-bold text-purple-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">UPI Payee Business Name</label>
              <input
                type="text"
                value={settings.upiPayeeName}
                onChange={(e) => setSettings({ ...settings, upiPayeeName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border text-sm font-semibold"
              />
            </div>
          </div>

          <h2 className="text-base font-extrabold text-gray-900 border-b pb-2 pt-4">
            3. Kitchen Timers & Thresholds
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Estimated Prep (Mins)</label>
              <input
                type="number"
                value={settings.estimatedPrepTimeMin}
                onChange={(e) => setSettings({ ...settings, estimatedPrepTimeMin: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Warning Timer (Yellow)</label>
              <input
                type="number"
                value={settings.warningTimeThresholdMin}
                onChange={(e) => setSettings({ ...settings, warningTimeThresholdMin: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border text-sm font-bold text-amber-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Late Timer (Red Alert)</label>
              <input
                type="number"
                value={settings.lateTimeThresholdMin}
                onChange={(e) => setSettings({ ...settings, lateTimeThresholdMin: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border text-sm font-bold text-rose-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full mt-6 bg-purple-700 hover:bg-purple-800 text-white font-extrabold py-4 rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving...' : 'Save Canteen Configuration'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
