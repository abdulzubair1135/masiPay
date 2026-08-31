'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import { getSocket } from '../../../../lib/socket';
import { useLanguage } from '../../../../context/LanguageContext';
import { OrderTimerBadge } from '../../../../components/OrderTimerBadge';
import { UpiPaymentModal } from '../../../../components/UpiPaymentModal';
import {
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CreditCard,
  ChefHat,
  BellRing,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function LiveOrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;
  const { t } = useLanguage();

  const [orderData, setOrderData] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/orders/${orderId}`);
      setOrderData(res.data.data.order);
      setPaymentData(res.data.data.payment);
      setHistory(res.data.data.history);
    } catch (err: any) {
      setError(err.message || 'Order not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();

      // Realtime Socket synchronization
      const socket = getSocket();
      socket.emit('join:room', `order-${orderId}`);

      socket.on('order:status_changed', (payload: any) => {
        if (payload.orderId === orderId) {
          setOrderData((prev: any) => ({
            ...prev,
            status: payload.status,
            cancellationReason: payload.cancellationReason || prev?.cancellationReason,
          }));

          if (payload.status === 'READY') {
            confetti({ particleCount: 50, spread: 70 });
          }
          if (payload.status === 'DELIVERED' || payload.status === 'COMPLETED') {
            confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
          }
        }
      });

      socket.on('payment:verified', (payload: any) => {
        if (payload.order?._id === orderId) {
          setOrderData((prev: any) => ({ ...prev, status: 'ACCEPTED' }));
          setPaymentData((prev: any) => ({ ...prev, status: 'VERIFIED' }));
        }
      });

      socket.on('payment:rejected', (payload: any) => {
        if (payload.orderId === orderId) {
          setOrderData((prev: any) => ({ ...prev, status: 'PENDING_PAYMENT' }));
          setPaymentData((prev: any) => ({ ...prev, status: 'REJECTED' }));
          alert(`Payment rejected: ${payload.reason}. Please check and pay via UPI.`);
        }
      });

      return () => {
        socket.emit('leave:room', `order-${orderId}`);
        socket.off('order:status_changed');
        socket.off('payment:verified');
        socket.off('payment:rejected');
      };
    }
  }, [orderId]);

  const handleClaimPaid = async (transactionRef?: string) => {
    try {
      setClaimLoading(true);
      await api.post(`/orders/${orderId}/payment-claimed`, {
        transactionReference: transactionRef,
      });
      setUpiModalOpen(false);
      fetchOrderDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to claim payment.');
    } finally {
      setClaimLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    const reason = prompt('Please enter cancellation reason:', 'Changed my mind');
    if (!reason) return;

    try {
      setCancelling(true);
      await api.post(`/orders/${orderId}/cancel`, { reason });
      fetchOrderDetails();
    } catch (err: any) {
      alert(err.message || 'Cannot cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-gray-700 mt-3">Connecting to Kitchen Live Stream...</p>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertTriangle className="w-14 h-14 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-extrabold text-gray-900">Order Not Found</h2>
        <p className="text-xs text-gray-500 mb-6">{error}</p>
        <button
          onClick={() => router.push('/orders')}
          className="bg-orange-600 text-white font-bold px-6 py-3 rounded-2xl"
        >
          View All Orders
        </button>
      </div>
    );
  }

  // Timeline stage calculation
  const status = orderData.status;
  const isPaid = paymentData?.status === 'VERIFIED' || status !== 'PENDING_PAYMENT' && status !== 'PAYMENT_VERIFYING';
  const isVerifying = paymentData?.status === 'USER_CLAIMED' || status === 'PAYMENT_VERIFYING';

  const stages = [
    { key: 'placed', label: t('orderPlaced'), completed: true },
    {
      key: 'payment',
      label: isPaid ? t('paymentVerified') : isVerifying ? t('paymentVerificationPending') : 'Payment Pending',
      completed: isPaid,
      active: isVerifying,
    },
    { key: 'prep', label: t('preparing'), completed: ['PREPARING', 'READY', 'DELIVERED', 'COMPLETED'].includes(status), active: status === 'PREPARING' },
    { key: 'ready', label: t('ready'), completed: ['READY', 'DELIVERED', 'COMPLETED'].includes(status), active: status === 'READY' },
    { key: 'delivered', label: t('delivered'), completed: ['DELIVERED', 'COMPLETED'].includes(status) },
  ];

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-12">
      {/* Back button */}
      <button
        onClick={() => router.push('/orders')}
        className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-orange-600 mb-3 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Orders</span>
      </button>

      {/* Hero Tracking Card */}
      <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-md mb-4 relative overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <div className="text-xs font-bold text-orange-600 uppercase tracking-wider">
              Live Order Tracker
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Order #{orderData.orderNumber}
            </h1>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-1 text-xs font-bold text-orange-700 bg-orange-100 px-3 py-1 rounded-full">
              <MapPin className="w-3.5 h-3.5" />
              <span>Table {orderData.tableNumber}</span>
            </div>
            <div className="mt-1.5">
              <OrderTimerBadge createdAt={orderData.createdAt} />
            </div>
          </div>
        </div>

        {/* Current State Announcement */}
        <div className="my-5 p-4 rounded-2xl bg-orange-50/80 border border-orange-200 text-center">
          {status === 'READY' ? (
            <div className="animate-bounce">
              <BellRing className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
              <h3 className="text-lg font-black text-emerald-900">Your Order is READY! 🔔</h3>
              <p className="text-xs text-emerald-700 mt-0.5">Please collect from the counter or Masi will bring it to Table {orderData.tableNumber}.</p>
            </div>
          ) : status === 'PREPARING' ? (
            <div>
              <ChefHat className="w-8 h-8 text-orange-600 mx-auto mb-1 animate-pulse" />
              <h3 className="text-lg font-black text-orange-950">{t('preparing')}</h3>
              <p className="text-xs text-orange-700 mt-0.5">{t('estimatedPrepTime')}</p>
            </div>
          ) : status === 'CANCELLED' ? (
            <div>
              <XCircle className="w-8 h-8 text-rose-600 mx-auto mb-1" />
              <h3 className="text-lg font-black text-rose-900">Order Cancelled</h3>
              <p className="text-xs text-rose-700 mt-0.5">Reason: {orderData.cancellationReason}</p>
            </div>
          ) : isVerifying ? (
            <div>
              <Clock className="w-8 h-8 text-purple-600 mx-auto mb-1 animate-spin" />
              <h3 className="text-lg font-black text-purple-950">Payment Under Verification</h3>
              <p className="text-xs text-purple-700 mt-0.5">Masi is checking payment received in UPI app.</p>
            </div>
          ) : !isPaid ? (
            <div>
              <CreditCard className="w-8 h-8 text-amber-600 mx-auto mb-1" />
              <h3 className="text-lg font-black text-amber-950">Payment Pending</h3>
              <button
                onClick={() => setUpiModalOpen(true)}
                className="mt-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md"
              >
                Pay ₹{orderData.total} via UPI
              </button>
            </div>
          ) : (
            <div>
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
              <h3 className="text-lg font-black text-gray-900">Order Placed & Accepted</h3>
              <p className="text-xs text-gray-600 mt-0.5">Kitchen is queueing your meal.</p>
            </div>
          )}
        </div>

        {/* Vertical Timeline */}
        <div className="space-y-4 pt-2">
          {stages.map((stg, index) => (
            <div key={stg.key} className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                  stg.completed
                    ? 'bg-emerald-600 text-white'
                    : stg.active
                    ? 'bg-orange-600 text-white animate-pulse'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {stg.completed ? '✓' : index + 1}
              </div>
              <div
                className={`text-xs font-extrabold ${
                  stg.completed
                    ? 'text-gray-900'
                    : stg.active
                    ? 'text-orange-600'
                    : 'text-gray-400'
                }`}
              >
                {stg.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ordered Items Summary */}
      <div className="bg-white rounded-3xl p-5 border border-orange-100 shadow-sm mb-4">
        <h3 className="text-sm font-extrabold text-gray-900 mb-3">Order Summary</h3>
        <div className="divide-y divide-gray-100 text-xs text-gray-700">
          {orderData.items.map((it: any, idx: number) => (
            <div key={idx} className="py-2 flex justify-between items-center">
              <div>
                <div className="font-extrabold text-gray-900">{it.itemName}</div>
                {it.specialInstruction && (
                  <div className="text-[11px] text-orange-600 italic">
                    Note: "{it.specialInstruction}"
                  </div>
                )}
                <div className="text-gray-500">
                  ₹{it.itemPrice} × {it.quantity}
                </div>
              </div>
              <div className="font-extrabold text-gray-900">
                ₹{it.itemPrice * it.quantity}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-gray-100 flex justify-between font-extrabold text-sm text-gray-900">
          <span>Total Amount</span>
          <span className="text-orange-600 text-base">₹{orderData.total}</span>
        </div>
      </div>

      {/* Cancel Action if allowed */}
      {(status === 'PENDING_PAYMENT' || status === 'PAYMENT_VERIFYING') && (
        <button
          onClick={handleCancelOrder}
          disabled={cancelling}
          className="w-full text-center py-3 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-2xl transition"
        >
          {cancelling ? 'Cancelling...' : t('cancelOrder')}
        </button>
      )}

      {/* UPI Payment Modal */}
      <UpiPaymentModal
        isOpen={upiModalOpen}
        onClose={() => setUpiModalOpen(false)}
        orderNumber={orderData.orderNumber}
        total={orderData.total}
        upiId="canteen@upi"
        payeeName="Masi Canteen Services"
        onClaimPaid={handleClaimPaid}
        loading={claimLoading}
      />
    </div>
  );
}
