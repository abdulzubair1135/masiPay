'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import {
  Shield,
  UtensilsCrossed,
  MapPin,
  Users,
  Clock,
  TrendingUp,
  Settings,
  LogOut,
  FileText,
  DollarSign,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'SUPER_ADMIN') {
      router.push('/login?redirect=/admin/dashboard');
      return;
    }

    async function loadMetrics() {
      try {
        setLoading(true);
        const res = await api.get('/admin/dashboard');
        setMetrics(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-gray-600 mt-3">Loading Canteen Analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      {/* Admin Header */}
      <header className="bg-gray-900 text-white sticky top-0 z-40 px-4 py-3 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-md">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight">
                MasiCanteen Admin Portal
              </div>
              <div className="text-[11px] text-gray-400 font-medium">
                Full System Administration & Reports
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Admin Navigation Pills */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-4">
          {[
            { href: '/admin/dashboard', label: 'Overview', active: true },
            { href: '/admin/menu', label: 'Menu & Stock' },
            { href: '/admin/tables', label: 'Tables & QR' },
            { href: '/admin/staff', label: 'Staff & Users' },
            { href: '/admin/orders', label: 'Orders Ledger' },
            { href: '/admin/settings', label: 'Canteen Settings' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap ${
                item.active
                  ? 'bg-purple-700 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-300'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
              <span>Today's Sales</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-gray-900 mt-2">
              ₹{metrics?.todayRevenue || 0}
            </div>
            <div className="text-[11px] text-emerald-600 font-bold mt-1">Verified UPI Payments</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
              <span>Today Orders</span>
              <TrendingUp className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-3xl font-black text-gray-900 mt-2">
              {metrics?.todayOrdersCount || 0}
            </div>
            <div className="text-[11px] text-gray-500 font-medium mt-1">
              {metrics?.completedCount} completed, {metrics?.cancelledCount} cancelled
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
              <span>Active Students</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-3xl font-black text-gray-900 mt-2">
              {metrics?.totalStudents || 0}
            </div>
            <div className="text-[11px] text-gray-500 font-medium mt-1">Registered Profiles</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
              <span>QR Tables</span>
              <MapPin className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-3xl font-black text-gray-900 mt-2">
              {metrics?.totalTables || 0}
            </div>
            <div className="text-[11px] text-purple-600 font-bold mt-1">Ready for Scanning</div>
          </div>
        </div>

        {/* Popular Dishes */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm mb-6">
          <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
            <span>🔥 Most Popular Canteen Items Today</span>
          </h3>

          {metrics?.popularItems?.length > 0 ? (
            <div className="space-y-3">
              {metrics.popularItems.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 font-black text-sm flex items-center justify-center">
                      #{idx + 1}
                    </div>
                    <span className="font-extrabold text-sm text-gray-900">{item._id}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-sm text-gray-900">{item.count} Sold</div>
                    <div className="text-xs text-emerald-600 font-bold">₹{item.revenue}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No orders recorded yet today.</p>
          )}
        </div>
      </div>
    </div>
  );
}
