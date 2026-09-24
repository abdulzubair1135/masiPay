'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import { getSocket } from '../../../lib/socket';
import { playOrderBellSound } from '../../../lib/sound';
import { OrderTimerBadge } from '../../../components/OrderTimerBadge';
import { CounterQrScannerModal } from '../../../components/CounterQrScannerModal';
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
  Banknote,
  Smartphone,
  Eye,
  Megaphone,
  Hourglass,
  AlertTriangle,
  MessageCircle,
  X,
  MapPin,
  Camera,
  Printer,
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
    cashSales: 0,
    upiSales: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PAYMENT' | 'PREPARING' | 'READY'>('ALL');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedProofImg, setSelectedProofImg] = useState<string | null>(null);
  const [counterModalOrder, setCounterModalOrder] = useState<any | null>(null);

  const availableCounters = [
    'Counter A',
    'Counter B',
    'Counter C',
    'Counter D',
    'Counter E',
    'Counter 1',
    'Counter 2',
    'Counter 3',
    'Counter 4',
    'Counter 5',
  ];

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

    const socket = getSocket();
    socket.emit('join:room', 'staff-room');

    socket.on('order:created', (newOrder: any) => {
      if (soundEnabled) playOrderBellSound();
      setOrders((prev) => [newOrder, ...prev]);
      setSummary((prev: any) => ({ ...prev, newOrders: (prev.newOrders || 0) + 1 }));
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
  const [verifyingAll, setVerifyingAll] = useState(false);

  const handleVerifyAll = async () => {
    try {
      setVerifyingAll(true);
      await api.post('/staff/orders/verify-all');
      await fetchActiveOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to bulk verify orders');
    } finally {
      setVerifyingAll(false);
    }
  };

  const handleVerifyPayment = async (orderId: string) => {
    try {
      await api.post(`/staff/orders/${orderId}/verify-payment`);
      await fetchActiveOrders();
    } catch (err: any) {
      alert(err.message || 'Payment verification failed');
    }
  };

  const handleRejectPayment = async (orderId: string) => {
    const reason = prompt('Reason for rejecting payment (e.g. Money not received):');
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

  const handleMarkReadyWithCounter = async (orderId: string, counter: string) => {
    try {
      await api.post(`/staff/orders/${orderId}/ready`, { counter });
      setCounterModalOrder(null);
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

  // Kitchen Quick Alerts
  const handleSendAlert = async (
    orderId: string,
    type: 'CALL_TO_COUNTER' | 'DELAY' | 'OUT_OF_STOCK' | 'CUSTOM',
    defaultMsg: string
  ) => {
    const message = prompt('Student Alert Message:', defaultMsg);
    if (!message) return;

    try {
      await api.post(`/staff/orders/${orderId}/alert`, { type, message });
      alert(`Alert sent to student phone!`);
    } catch (err: any) {
      alert(err.message || 'Failed to send alert');
    }
  };

  const handleWhatsAppDailyReport = async () => {
    try {
      const res = await api.get('/staff/daily-report');
      const text = encodeURIComponent(res.data.data.reportText);
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    } catch (err: any) {
      alert('Failed to generate WhatsApp report');
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
              Welcome, <strong className="text-gray-800">{user.name}</strong> • Quick Touch Orders Screen
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Daily WhatsApp Summary Button */}
          <button
            onClick={handleWhatsAppDailyReport}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-2 rounded-2xl text-xs shadow-md transition"
            title="Export 24h Daily WhatsApp Summary"
          >
            <MessageCircle className="w-4 h-4" />
            <span>24h WhatsApp Report</span>
          </button>

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
          <div className="text-[11px] font-bold text-gray-400 uppercase">Today's Sales</div>
          <div className="text-2xl font-black text-gray-900 mt-0.5">₹{summary.todaySales || 0}</div>
          <div className="text-[10px] text-gray-400 font-semibold mt-0.5">
            UPI: ₹{summary.upiSales || 0} • Cash: ₹{summary.cashSales || 0}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
        {[
          { id: 'ALL', label: `All Orders (${orders.length})` },
          { id: 'PAYMENT', label: `Needs Verification (${orders.filter(o => ['PENDING_PAYMENT', 'PAYMENT_VERIFYING'].includes(o.status)).length})` },
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

      {/* Bulk 1-Click Verification Banner when multiple students pay at once */}
      {orders.filter((o) => ['PENDING_PAYMENT', 'PAYMENT_VERIFYING'].includes(o.status)).length > 1 && (
        <div className="mb-4 p-4 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-black text-lg">
              ⚡
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-amber-100">
                Rush Alert: {orders.filter((o) => ['PENDING_PAYMENT', 'PAYMENT_VERIFYING'].includes(o.status)).length} Student Payments Waiting
              </div>
              <div className="text-xs font-extrabold text-white/90">
                Ek sath sabhi orders ko 1-Click mein accept aur cooking queue mein bhejein:
              </div>
            </div>
          </div>
          <button
            onClick={handleVerifyAll}
            disabled={verifyingAll}
            className="py-3 px-5 bg-white hover:bg-amber-50 text-orange-700 font-black text-xs rounded-2xl shadow-md transition active:scale-95 whitespace-nowrap flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{verifyingAll ? 'Verifying All...' : `⚡ Verify All (${orders.filter((o) => ['PENDING_PAYMENT', 'PAYMENT_VERIFYING'].includes(o.status)).length} Orders)`}</span>
          </button>
        </div>
      )}

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
            const isPending = order.status === 'PENDING_PAYMENT';
            const isVerifying = order.status === 'PAYMENT_VERIFYING';
            const isAccepted = order.status === 'ACCEPTED';
            const isPreparing = order.status === 'PREPARING';
            const isReady = order.status === 'READY';
            const isCash = order.payment?.method === 'CASH';

            return (
              <div
                key={order._id}
                className={`bg-white rounded-3xl p-5 border-2 shadow-sm flex flex-col justify-between transition-all ${
                  isVerifying
                    ? 'border-amber-400 bg-amber-50/20 shadow-amber-500/10'
                    : isReady
                    ? 'border-emerald-400 bg-emerald-50/20'
                    : isPreparing
                    ? 'border-orange-400'
                    : 'border-gray-200'
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

                    <OrderTimerBadge createdAt={order.createdAt} />
                  </div>

                  {/* Student Info with Live Selfie Photo & Direct Call Button */}
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl mb-3 border border-gray-100">
                    <img
                      src={order.userId?.profileImage || 'https://api.dicebear.com/7.x/bottts/svg?seed=student'}
                      alt={order.userId?.name || 'Student'}
                      className="w-12 h-12 rounded-full border-2 border-orange-400 object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-extrabold text-gray-900 truncate">
                        {order.userId?.name || 'Student'}
                      </div>
                      <a
                        href={`tel:${order.userId?.phone || ''}`}
                        className="text-[11px] font-bold text-orange-600 hover:underline flex items-center gap-1 mt-0.5"
                        title="Click to Call Student"
                      >
                        <Phone className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        <span>+91 {order.userId?.phone || 'No phone'} (Call)</span>
                      </a>
                      {order.userId?.phone && (
                        <a
                          href={`https://wa.me/91${order.userId.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `🎉 *SRK Canteen Alert!*\n\nHello ${order.userId.name || 'Student'}! Aapka Order *TOKEN #${order.orderNumber}* ready hai! 🍽️\n\n📍 *Pickup Counter:* ${order.pickupCounter || 'Counter A'}\n💰 *Amount:* ₹${order.total}\n\nCounter se apna order collect kar lein! 🚀`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 mt-1 transition"
                          title="Send WhatsApp Ready Alert to Student"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>WhatsApp Alert</span>
                        </a>
                      )}
                    </div>

                    {/* Payment Mode Badge */}
                    <div className="text-right">
                      {isCash ? (
                        <div className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                          <Banknote className="w-3 h-3" />
                          <span>CASH</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                          <Smartphone className="w-3 h-3" />
                          <span>UPI</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* App-Assigned Target Counter Banner */}
                  <div className="mb-3 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs font-black text-amber-900">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      <span>Target Counter:</span>
                    </div>
                    <span className="bg-amber-600 text-white px-2 py-0.5 rounded-lg font-black">{order.pickupCounter || 'Counter A'}</span>
                  </div>

                  {/* Cash Proof Image thumbnail */}
                  {order.payment?.proofImage && (
                    <div className="mb-3 p-2 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={order.payment.proofImage}
                          alt="Proof"
                          className="w-10 h-10 rounded-xl object-cover border border-emerald-400"
                        />
                        <div className="text-[11px] font-bold text-emerald-900">
                          Cash Proof Attached
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedProofImg(order.payment.proofImage)}
                        className="text-xs font-black text-emerald-700 bg-white px-2.5 py-1 rounded-xl shadow-xs border border-emerald-300 hover:bg-emerald-100 transition flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Photo</span>
                      </button>
                    </div>
                  )}

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

                {/* Action Pipeline & Quick Kitchen Alerts */}
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  {isPending && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-extrabold text-gray-500 text-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                        Waiting for student to claim payment (UPI / Cash)
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleRejectPayment(order._id)}
                          className="py-2.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs rounded-xl border border-rose-200 transition"
                        >
                          ❌ Cancel Order
                        </button>
                        <button
                          onClick={() => handleVerifyPayment(order._id)}
                          className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition"
                        >
                          ⚡ Direct Accept (Paid)
                        </button>
                      </div>
                    </div>
                  )}

                  {isVerifying && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-extrabold text-amber-900 text-center bg-amber-100/70 p-2 rounded-xl">
                        Student claimed {isCash ? '💵 Cash' : '📱 UPI'} payment of ₹{order.total}
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
                      className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 text-white font-black text-xs rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <ChefHat className="w-4 h-4" />
                      <span>Start Cooking</span>
                    </button>
                  )}

                  {isPreparing && (
                    <button
                      onClick={() => setCounterModalOrder(order)}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white font-black text-xs rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Ready & Choose Counter (A, B, C...)</span>
                    </button>
                  )}

                  {isReady && (
                    <div className="space-y-2">
                      <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 text-center">
                        <span>📍 Rakha Hai: <strong>{order.pickupCounter || 'Counter A'}</strong></span>
                      </div>
                      <button
                        onClick={() => handleMarkDelivered(order._id)}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Hand Over to Student (Delivered)</span>
                      </button>
                    </div>
                  )}

                  {/* Kitchen Quick Callouts & Alerts Bar */}
                  <div className="flex items-center gap-1 pt-1 overflow-x-auto scrollbar-none">
                    <button
                      type="button"
                      onClick={() =>
                        handleSendAlert(
                          order._id,
                          'CALL_TO_COUNTER',
                          `🔔 Token #${order.orderNumber} TAIYAAR HAI! Counter par aakar le jayein!`
                        )
                      }
                      className="flex-1 py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-[10px] font-black border border-purple-200 whitespace-nowrap flex items-center justify-center gap-1 transition"
                      title="Send Loud Alert on Student Phone"
                    >
                      <Megaphone className="w-3 h-3 text-purple-600" />
                      <span>आजा खाना लेने</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleSendAlert(
                          order._id,
                          'DELAY',
                          `⏳ Token #${order.orderNumber}: Thoda rush hai, 5-7 min extra lagenge.`
                        )
                      }
                      className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-[10px] font-black border border-amber-200 whitespace-nowrap flex items-center gap-1 transition"
                    >
                      <Hourglass className="w-3 h-3" />
                      <span>+5 Min</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleSendAlert(
                          order._id,
                          'OUT_OF_STOCK',
                          `⚠️ Token #${order.orderNumber}: Item khatam ho gaya hai. Counter par aakar swap ya refund lein.`
                        )
                      }
                      className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-[10px] font-black border border-rose-200 whitespace-nowrap flex items-center gap-1 transition"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span>Supply No More</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pickup Counter Camera QR Scanner & Selection Modal */}
      {counterModalOrder && (
        <CounterQrScannerModal
          isOpen={!!counterModalOrder}
          onClose={() => setCounterModalOrder(null)}
          orderNumber={counterModalOrder.orderNumber}
          orderId={counterModalOrder._id}
          assignedCounter={counterModalOrder.pickupCounter || 'Counter A'}
          onCounterSelected={(cnt) => handleMarkReadyWithCounter(counterModalOrder._id, cnt)}
        />
      )}

      {/* Cash Proof Modal View */}
      {selectedProofImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-white rounded-3xl p-4 max-w-sm w-full text-center relative shadow-2xl">
            <button
              onClick={() => setSelectedProofImg(null)}
              className="absolute top-3 right-3 p-2 bg-gray-100 rounded-full hover:bg-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-extrabold text-sm text-gray-900 mb-3">
              💵 Student Cash Proof Photo
            </h3>
            <img
              src={selectedProofImg}
              alt="Cash Proof"
              className="w-full h-72 object-contain rounded-2xl bg-black/5 mb-3"
            />
            <button
              onClick={() => setSelectedProofImg(null)}
              className="w-full py-2.5 bg-gray-900 text-white font-bold rounded-xl text-xs"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
