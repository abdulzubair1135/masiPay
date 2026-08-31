'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { getSocket } from '../../../lib/socket';
import { playOrderBellSound } from '../../../lib/sound';
import { OrderTimerBadge } from '../../../components/OrderTimerBadge';
import {
  ChefHat,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Volume2,
  DollarSign,
  ShoppingBag,
  History,
  LogOut,
  Sparkles,
  Flame,
} from 'lucide-react';

export default function StaffKitchenDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();

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
    if (!user || user.role === 'STUDENT') {
      router.push('/login?redirect=/staff/dashboard');
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

    return () => {
      socket.off('order:created');
      socket.off('payment:claimed');
      socket.off('order:status_changed');
    };
  }, [user, soundEnabled]);

  // Actions
  const handleVerifyPayment = async (orderId: string) => {
    try {
      await api.post(`/staff/payments/${orderId}/verify`, {});
      fetchActiveOrders();
    } catch (err: any) {
      alert(err.message || 'Verification failed');
    }
  };

  const handleRejectPayment = async (orderId: string) => {
    const reason = prompt('Why is payment rejected?', 'Payment not received in UPI');
    if (!reason) return;

    try {
      await api.post(`/staff/payments/${orderId}/reject`, { reason });
      fetchActiveOrders();
    } catch (err: any) {
      alert(err.message || 'Reject failed');
    }
  };

  const handleUpdateStatus = async (orderId: string, action: 'accept' | 'preparing' | 'ready' | 'delivered') => {
    try {
      await api.post(`/staff/orders/${orderId}/${action}`, {});
      fetchActiveOrders();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const reason = prompt('Why are you cancelling this order?', 'Item unavailable');
    if (!reason) return;

    try {
      await api.post(`/staff/orders/${orderId}/cancel`, { reason });
      fetchActiveOrders();
    } catch (err: any) {
      alert(err.message || 'Cancel failed');
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'PAYMENT') return o.status === 'PAYMENT_VERIFYING' || o.status === 'PENDING_PAYMENT';
    if (activeTab === 'PREPARING') return o.status === 'PREPARING' || o.status === 'ACCEPTED';
    if (activeTab === 'READY') return o.status === 'READY';
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      {/* Staff Kitchen Header Bar */}
      <header className="bg-gray-900 text-white sticky top-0 z-40 px-4 py-3 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-md">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight flex items-center gap-2">
                <span>Masi Kitchen Dashboard</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="text-[11px] text-gray-400 font-medium">
                Logged in as {user?.name || 'Masi'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playOrderBellSound();
              }}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                soundEnabled ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
              title="Toggle Sound Bell"
            >
              <Volume2 className="w-4 h-4" />
              <span className="hidden sm:inline">{soundEnabled ? 'Sound ON' : 'Sound OFF'}</span>
            </button>

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

      {/* Metrics Row */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-2xs">
            <div className="text-xs text-gray-500 font-bold uppercase">Pending / New</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{summary.newOrders}</div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-2xs">
            <div className="text-xs text-gray-500 font-bold uppercase">Preparing 🍳</div>
            <div className="text-2xl font-black text-orange-600 mt-1">{summary.preparing}</div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-2xs">
            <div className="text-xs text-gray-500 font-bold uppercase">Ready to Serve 🔔</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{summary.ready}</div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-2xs">
            <div className="text-xs text-gray-500 font-bold uppercase">Today's Sales 💰</div>
            <div className="text-2xl font-black text-gray-900 mt-1">₹{summary.todaySales}</div>
          </div>
        </div>

        {/* Pipeline Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          {[
            { key: 'ALL', label: `All Active (${orders.length})` },
            { key: 'PAYMENT', label: 'Payment Check' },
            { key: 'PREPARING', label: 'In Kitchen' },
            { key: 'READY', label: 'Ready for Pickup' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Kitchen Orders Grid */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold text-gray-600 mt-3">Syncing Kitchen Orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200">
            <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-xl font-extrabold text-gray-900">All Orders Fulfilled! 🎉</h3>
            <p className="text-xs text-gray-500 mt-1">No pending food items in the queue right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => {
              const isClaimed = order.status === 'PAYMENT_VERIFYING';
              const isAccepted = order.status === 'ACCEPTED';
              const isPreparing = order.status === 'PREPARING';
              const isReady = order.status === 'READY';

              return (
                <div
                  key={order._id}
                  className={`bg-white rounded-3xl p-5 border-2 shadow-sm flex flex-col justify-between transition-all ${
                    isClaimed
                      ? 'border-purple-400 ring-2 ring-purple-400/20 bg-purple-50/20'
                      : isReady
                      ? 'border-emerald-400 bg-emerald-50/10'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                >
                  <div>
                    {/* Card Header: Order #, Table #, Timer */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div>
                        <div className="text-xs font-extrabold text-orange-600">
                          ORDER #{order.orderNumber}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-4 h-4 text-gray-700" />
                          <span className="text-base font-black text-gray-900">
                            TABLE {order.tableNumber}
                          </span>
                        </div>
                      </div>

                      <OrderTimerBadge createdAt={order.createdAt} />
                    </div>

                    {/* Student Info */}
                    <div className="flex items-center gap-2.5 py-3 border-b border-gray-100">
                      <img
                        src={order.userId?.profileImage || 'https://api.dicebear.com/7.x/bottts/svg?seed=student'}
                        alt={order.userId?.name}
                        className="w-10 h-10 rounded-full border border-gray-200 object-cover"
                      />
                      <div>
                        <div className="text-sm font-extrabold text-gray-900 leading-tight">
                          {order.userId?.name || 'Guest Student'}
                        </div>
                        <div className="text-xs font-bold text-gray-500">
                          Roll: {order.userId?.rollNumber || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Ordered Items list */}
                    <div className="py-3 space-y-2">
                      {order.items.map((it: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 p-2.5 rounded-2xl">
                          <div className="flex justify-between items-center text-sm font-black text-gray-900">
                            <span>{it.itemName}</span>
                            <span className="bg-white px-2 py-0.5 rounded-lg border text-xs font-extrabold text-orange-600">
                              × {it.quantity}
                            </span>
                          </div>
                          {it.specialInstruction && (
                            <div className="text-xs text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-md mt-1">
                              Note: "{it.specialInstruction}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Amount & Status info */}
                    <div className="flex items-center justify-between py-2 border-t border-gray-100 font-extrabold text-sm text-gray-900">
                      <span>Total Bill</span>
                      <span className="text-base text-orange-600">₹{order.total}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                    {/* Payment Verification Banner */}
                    {isClaimed && (
                      <div className="p-3 bg-purple-100/70 border border-purple-300 rounded-2xl text-center mb-2">
                        <div className="text-xs font-black text-purple-900 mb-1">
                          🔔 Student says: "I Paid via UPI"
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerifyPayment(order._id)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-2.5 px-3 rounded-xl shadow-xs transition"
                          >
                            ✓ VERIFY ₹{order.total}
                          </button>
                          <button
                            onClick={() => handleRejectPayment(order._id)}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition"
                          >
                            REJECT
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Order Progress Buttons */}
                    {isAccepted ? (
                      <button
                        onClick={() => handleUpdateStatus(order._id, 'preparing')}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black text-sm py-3 px-4 rounded-2xl shadow-md transition"
                      >
                        🍳 START PREPARING
                      </button>
                    ) : isPreparing ? (
                      <button
                        onClick={() => handleUpdateStatus(order._id, 'ready')}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3 px-4 rounded-2xl shadow-md transition animate-pulse"
                      >
                        🔔 MARK READY (ALERT STUDENT)
                      </button>
                    ) : isReady ? (
                      <button
                        onClick={() => handleUpdateStatus(order._id, 'delivered')}
                        className="w-full bg-gray-900 hover:bg-black text-white font-black text-sm py-3 px-4 rounded-2xl shadow-md transition"
                      >
                        ✅ MARK DELIVERED
                      </button>
                    ) : !isClaimed ? (
                      <button
                        onClick={() => handleUpdateStatus(order._id, 'accept')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-sm py-3 px-4 rounded-2xl shadow-md transition"
                      >
                        ACCEPT ORDER
                      </button>
                    ) : null}

                    {/* Cancel button */}
                    <button
                      onClick={() => handleCancelOrder(order._id)}
                      className="w-full text-center text-xs font-bold text-gray-400 hover:text-rose-600 py-1 transition"
                    >
                      Cancel Order
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
