'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import { getSocket } from '../../../lib/socket';
import { playOrderBellSound } from '../../../lib/sound';
import { OrderTimerBadge } from '../../../components/OrderTimerBadge';
import {
  ChefHat,
  Bell,
  BellOff,
  CheckCircle2,
  Clock,
  QrCode,
  DollarSign,
  AlertCircle,
  XCircle,
  LogOut,
  RefreshCw,
  Phone,
  ShieldAlert,
} from 'lucide-react';

export default function StaffKitchenDashboard() {
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    newOrders: 0,
    preparing: 0,
    ready: 0,
    completed: 0,
    todaySales: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PAYMENT' | 'PREPARING' | 'READY'>('ALL');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const fetchActiveOrders = async () => {
    try {
      setLoading(true);
      const [ordersRes, sumRes] = await Promise.all([
        api.get('/staff/orders'),
        api.get('/staff/summary'),
      ]);
      setOrders(ordersRes.data.data);
      setSummary(sumRes.data.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user || user.role === 'STUDENT') {
      return;
    }

    fetchActiveOrders();

    // Socket real-time listeners for Staff Room
    const socket = getSocket();
    socket.emit('join:room', 'staff-room');

    socket.on('order:created', (newOrder: any) => {
      if (soundEnabled) playOrderBellSound();
      setOrders((prev) => [newOrder, ...prev]);
      setSummary((prev: any) => ({ ...prev, newOrders: prev.newOrders + 1 }));
    });

    socket.on('payment:claimed', (payload: any) => {
      if (soundEnabled) playOrderBellSound();
      setOrders((prev) =>
        prev.map((o) =>
          o._id === payload.orderId ? { ...o, status: 'PAYMENT_VERIFYING' } : o
        )
      );
    });

    socket.on('order:status_changed', (payload: any) => {
      if (payload.status === 'COMPLETED' || payload.status === 'CANCELLED') {
        setOrders((prev) => prev.filter((o) => o._id !== payload.orderId));
      } else {
        setOrders((prev) =>
          prev.map((o) =>
            o._id === payload.orderId ? { ...o, status: payload.status } : o
          )
        );
      }
    });

    socket.on('payment:verified', (payload: any) => {
      setOrders((prev) =>
        prev.map((o) =>
          o._id === payload.orderId ? { ...o, status: 'ACCEPTED' } : o
        )
      );
    });

    return () => {
      socket.emit('leave:room', 'staff-room');
      socket.off('order:created');
      socket.off('payment:claimed');
      socket.off('order:status_changed');
      socket.off('payment:verified');
    };
  }, [user, authLoading, soundEnabled]);

  // Actions
  const handleVerifyPayment = async (orderId: string) => {
    try {
      await api.post(`/staff/orders/${orderId}/verify-payment`);
      await fetchActiveOrders();
    } catch (err: any) {
      alert(err.message || 'Payment verification failed');
    }
  };

  const handleRejectPayment = async (orderId: string) => {
    const reason = prompt('Reason for rejecting payment (e.g. UPI money not received):');
    if (!reason) return;
    try {
      await api.post(`/staff/orders/${orderId}/reject-payment`, { reason });
      await fetchActiveOrders();
    } catch (err: any) {
      alert(err.message || 'Payment rejection failed');
    }
  };

  const handleStartPreparing = async (orderId: string) => {
    try {
      await api.post(`/staff/orders/${orderId}/preparing`);
      await fetchActiveOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleMarkReady = async (orderId: string) => {
    try {
      await api.post(`/staff/orders/${orderId}/ready`);
      await fetchActiveOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    try {
      await api.post(`/staff/orders/${orderId}/delivered`);
      await fetchActiveOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to complete order');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="mt-4 font-bold text-gray-700">Verifying session...</div>
      </div>
    );
  }

  if (!user || user.role === 'STUDENT') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-gray-900 mb-1">Masi Kitchen Staff Only</h2>
        <p className="text-xs text-gray-600 mb-6">
          This portal is reserved for Canteen Masi and Kitchen Staff to manage live orders and verify UPI payments.
        </p>
        <button
          onClick={() => {
            logout();
            router.push('/login');
          }}
          className="bg-gray-900 hover:bg-black text-white font-extrabold px-6 py-3 rounded-2xl shadow-md transition text-xs"
        >
          Login as Staff / Masi
        </button>
      </div>
    );
  }

  // Filter orders by tab
  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'PAYMENT') return ['PENDING_PAYMENT', 'PAYMENT_VERIFYING'].includes(o.status);
    if (activeTab === 'PREPARING') return ['ACCEPTED', 'PREPARING'].includes(o.status);
    if (activeTab === 'READY') return o.status === 'READY';
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 pb-20">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-orange-100 shadow-sm mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-gray-900 tracking-tight">
                Masi Kitchen Order Screen
              </h1>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                LIVE
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Welcome back, <strong className="text-gray-800">{user.name}</strong> • Quick Touch Orders Screen
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-extrabold border transition ${
              soundEnabled
                ? 'bg-orange-50 text-orange-700 border-orange-200'
                : 'bg-gray-50 text-gray-400 border-gray-200'
            }`}
          >
            {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            <span>{soundEnabled ? 'Bell On' : 'Muted'}</span>
          </button>

          <button
            onClick={fetchActiveOrders}
            className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3.5 py-2 rounded-2xl text-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-3.5 py-2 rounded-2xl text-xs transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white p-4 rounded-3xl border border-orange-100 shadow-sm">
          <div className="text-[11px] font-bold text-gray-400 uppercase">Incoming Payments</div>
          <div className="text-2xl font-black text-amber-600 mt-0.5">{summary.newOrders || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-orange-100 shadow-sm">
          <div className="text-[11px] font-bold text-gray-400 uppercase">Cooking Now</div>
          <div className="text-2xl font-black text-orange-600 mt-0.5">{summary.preparing || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-orange-100 shadow-sm">
          <div className="text-[11px] font-bold text-gray-400 uppercase">Ready For Pickup</div>
          <div className="text-2xl font-black text-emerald-600 mt-0.5">{summary.ready || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-orange-100 shadow-sm">
          <div className="text-[11px] font-bold text-gray-400 uppercase">Today's Total Sales</div>
          <div className="text-2xl font-black text-gray-900 mt-0.5">₹{summary.todaySales || 0}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
        {[
          { id: 'ALL', label: `All Orders (${orders.length})` },
          { id: 'PAYMENT', label: `Needs UPI Verification (${orders.filter(o => ['PENDING_PAYMENT', 'PAYMENT_VERIFYING'].includes(o.status)).length})` },
          { id: 'PREPARING', label: `Cooking (${orders.filter(o => ['ACCEPTED', 'PREPARING'].includes(o.status)).length})` },
          { id: 'READY', label: `Ready (${orders.filter(o => o.status === 'READY').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-200">
          <ChefHat className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <h3 className="text-base font-extrabold text-gray-700">Kitchen is all clear!</h3>
          <p className="text-xs text-gray-400 mt-1">No active orders in this view.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const isVerifying = order.status === 'PAYMENT_VERIFYING';
            const isAccepted = order.status === 'ACCEPTED';
            const isPreparing = order.status === 'PREPARING';
            const isReady = order.status === 'READY';

            return (
              <div
                key={order._id}
                className={`bg-white rounded-3xl p-5 border-2 shadow-sm flex flex-col justify-between transition-all ${
                  isVerifying
                    ? 'border-amber-400 bg-amber-50/20 shadow-amber-500/10'
                    : isReady
                    ? 'border-emerald-400 bg-emerald-50/20'
                    : 'border-orange-200'
                }`}
              >
                <div>
                  {/* Top Bar: Token Number & Elapsed Timer */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-900 px-3 py-1 rounded-full text-xs font-black">
                        <QrCode className="w-3.5 h-3.5" />
                        <span>TOKEN #{order.orderNumber}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 font-bold mt-1">
                        Table: {order.tableNumber || 'Token Pickup'}
                      </div>
                    </div>

                    <OrderTimerBadge startTime={order.createdAt} isCompleted={false} />
                  </div>

                  {/* Student Info with Live Selfie Photo */}
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl mb-3 border border-gray-100">
                    <img
                      src={order.userId?.profileImage || 'https://api.dicebear.com/7.x/bottts/svg?seed=student'}
                      alt={order.userId?.name || 'Student'}
                      className="w-12 h-12 rounded-full border-2 border-orange-400 object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-gray-900 truncate">
                        {order.userId?.name || 'Student'}
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-orange-600" />
                        <span>+91 {order.userId?.phone || 'No phone'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-1.5 mb-4">
                    {order.items.map((it: any, idx: number) => (
                      <div key={idx} className="flex items-start justify-between text-xs py-1 border-b border-gray-50">
                        <div>
                          <span className="font-extrabold text-gray-900">{it.itemName}</span>
                          <span className="text-orange-600 font-black ml-1.5">× {it.quantity}</span>
                          {it.specialInstruction && (
                            <div className="text-[10px] text-rose-600 font-bold">
                              Note: {it.specialInstruction}
                            </div>
                          )}
                        </div>
                        <div className="font-bold text-gray-700">₹{it.itemPrice * it.quantity}</div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between pt-2 font-black text-xs text-gray-900">
                      <span>Total Amount:</span>
                      <span className="text-orange-600 font-extrabold text-sm">₹{order.total}</span>
                    </div>
                  </div>
                </div>

                {/* Action Pipeline Buttons */}
                <div className="pt-3 border-t border-gray-100">
                  {order.status === 'PENDING_PAYMENT' && (
                    <div className="text-center text-xs font-bold text-gray-400 py-2">
                      Waiting for student to pay via UPI...
                    </div>
                  )}

                  {isVerifying && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-extrabold text-amber-800 text-center bg-amber-100/60 p-2 rounded-xl">
                        Student claimed ₹{order.total} UPI payment
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleRejectPayment(order._id)}
                          className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs rounded-xl border border-rose-200 transition"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleVerifyPayment(order._id)}
                          className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition"
                        >
                          Verify & Accept
                        </button>
                      </div>
                    </div>
                  )}

                  {isAccepted && (
                    <button
                      onClick={() => handleStartPreparing(order._id)}
                      className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <ChefHat className="w-4 h-4" />
                      <span>Start Cooking</span>
                    </button>
                  )}

                  {isPreparing && (
                    <button
                      onClick={() => handleMarkReady(order._id)}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Ready for Pickup</span>
                    </button>
                  )}

                  {isReady && (
                    <button
                      onClick={() => handleMarkDelivered(order._id)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Hand Over to Student</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
