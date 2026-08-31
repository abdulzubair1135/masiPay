'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import { getSocket } from '../../../../lib/socket';
import { useLanguage } from '../../../../context/LanguageContext';
import { OrderTimerBadge } from '../../../../components/OrderTimerBadge';
import { UpiPaymentModal } from '../../../../components/UpiPaymentModal';
import QRCode from 'qrcode';
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
  QrCode,
  Phone,
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
  const [tokenQrDataUrl, setTokenQrDataUrl] = useState<string>('');
  const [activeAlert, setActiveAlert] = useState<any>(null);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/orders/${orderId}`);
      const ord = res.data.data.order;
      setOrderData(ord);
      setPaymentData(res.data.data.payment);
      setHistory(res.data.data.history);
      if (ord.kitchenAlert) {
        setActiveAlert(ord.kitchenAlert);
      }

      // Generate live Dynamic Pickup QR for this order
      if (ord && ord.orderNumber) {
        const qrPayload = JSON.stringify({
          orderId: ord._id,
          token: ord.orderNumber,
          phone: ord.userId?.phone,
          amount: ord.total,
        });
        const dataUrl = await QRCode.toDataURL(qrPayload, {
          width: 260,
          margin: 1.5,
          color: { dark: '#ea580c', light: '#ffffff' },
        });
        setTokenQrDataUrl(dataUrl);
      }
    } catch (err: any) {
      setError(err.message || 'Order not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();

      const socket = getSocket();
      socket.emit('join:room', `order-${orderId}`);

      socket.on('order:status_changed', (data: any) => {
        if (data.orderId === orderId) {
          setOrderData((prev: any) => (prev ? { ...prev, status: data.newStatus } : prev));
          if (data.newStatus === 'READY' || data.newStatus === 'DELIVERED') {
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
          }
        }
      });

      socket.on('payment:verified', (data: any) => {
        if (data.orderId === orderId) {
          setPaymentData((prev: any) => (prev ? { ...prev, status: 'VERIFIED' } : prev));
        }
      });

      socket.on('kitchen:alert', (data: any) => {
        if (data.orderId === orderId) {
          setActiveAlert(data);
          confetti({ particleCount: 50, spread: 60 });
        }
      });

      return () => {
        socket.emit('leave:room', `order-${orderId}`);
        socket.off('order:status_changed');
        socket.off('payment:verified');
        socket.off('kitchen:alert');
      };
    }
  }, [orderId]);

  const handleClaimPayment = async (
    txRef?: string,
    paymentMethod?: 'UPI_MANUAL' | 'CASH',
    proofImage?: string
  ) => {
    try {
      setClaimLoading(true);
      try {
        await api.post(`/orders/${orderId}/claim-payment`, {
          transactionReference: txRef || undefined,
          paymentMethod: paymentMethod || 'UPI_MANUAL',
          proofImage: proofImage || undefined,
        });
      } catch (e) {
        await api.post(`/orders/${orderId}/payment-claimed`, {
          transactionReference: txRef || undefined,
          paymentMethod: paymentMethod || 'UPI_MANUAL',
          proofImage: proofImage || undefined,
        });
      }
      setUpiModalOpen(false);
      await fetchOrderDetails();
    } catch (err: any) {
      console.warn('Claim notice:', err);
      setUpiModalOpen(false);
      await fetchOrderDetails();
    } finally {
      setClaimLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    const reason = prompt('Please enter cancellation reason:');
    if (!reason || !reason.trim()) return;

    try {
      setCancelling(true);
      await api.post(`/orders/${orderId}/cancel`, { reason: reason.trim() });
      await fetchOrderDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
        <h2 className="mt-4 font-bold text-base text-gray-800">Loading Order Details...</h2>
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

  const status = orderData.status;
  const isPaid = paymentData?.status === 'VERIFIED' || (status !== 'PENDING_PAYMENT' && status !== 'PAYMENT_VERIFYING');
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
    <div className="max-w-md mx-auto px-4 py-4 pb-16">
      {/* Back button */}
      <button
        onClick={() => router.push('/orders')}
        className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-orange-600 mb-3 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Orders</span>
      </button>

      {/* Kitchen Alert Banner */}
      {activeAlert && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-3xl p-4 mb-4 shadow-xl shadow-purple-600/20 border-2 border-purple-300 animate-bounce">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-xl">📢</span>
            <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
              Kitchen Notice / मासी का संदेश
            </span>
          </div>
          <p className="text-sm font-extrabold leading-snug">
            {activeAlert.message}
          </p>
        </div>
      )}

      {/* Hero Token QR Card */}
      <div className="bg-white rounded-3xl p-6 border-2 border-orange-200 shadow-xl mb-4 text-center relative overflow-hidden">
        <div className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-800 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2">
          <QrCode className="w-3.5 h-3.5" />
          <span>Live Pickup Token</span>
        </div>

        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
          TOKEN #{orderData.orderNumber}
        </h1>

        <p className="text-xs text-gray-500 mt-0.5">
          Show this Token / QR code to Masi at the counter
        </p>

        {/* Dynamic QR Code */}
        {tokenQrDataUrl && (
          <div className="my-4 flex justify-center">
            <div className="p-3 bg-white border-2 border-orange-400 rounded-3xl shadow-inner inline-block">
              <img
                src={tokenQrDataUrl}
                alt={`Token #${orderData.orderNumber}`}
                className="w-48 h-48 mx-auto"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2">
          <OrderTimerBadge createdAt={orderData.createdAt} />
        </div>
      </div>

      {/* Payment Action banner */}
      {!isPaid && (
        <div className="bg-amber-50 rounded-3xl p-5 border border-amber-200 mb-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-amber-700" />
                <span>Payment Verification Required</span>
              </div>
              <p className="text-[11px] text-amber-700 mt-1 leading-snug">
                {isVerifying
                  ? 'You claimed payment. Masi is checking her UPI app to verify.'
                  : 'Please pay via UPI so Masi can accept and start preparing your meal.'}
              </p>
            </div>

            <button
              onClick={() => setUpiModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition whitespace-nowrap active:scale-95"
            >
              {isVerifying ? 'View QR' : 'Pay ₹' + orderData.total}
            </button>
          </div>
        </div>
      )}

      {/* 5-Stage Live Timeline */}
      <div className="bg-white rounded-3xl p-5 border border-orange-100 shadow-sm mb-4">
        <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-4">
          Kitchen Live Status
        </h2>

        <div className="space-y-4">
          {stages.map((stg, idx) => (
            <div key={stg.key} className="flex items-center gap-3 relative">
              {idx < stages.length - 1 && (
                <div
                  className={`absolute left-3.5 top-7 bottom-0 w-0.5 -mb-4 ${
                    stg.completed ? 'bg-emerald-500' : 'bg-gray-200'
                  }`}
                />
              )}

              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  stg.completed
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : stg.active
                    ? 'bg-orange-600 text-white animate-pulse shadow-md shadow-orange-600/30 ring-4 ring-orange-100'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {stg.completed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
              </div>

              <div>
                <div
                  className={`text-xs font-extrabold ${
                    stg.completed
                      ? 'text-emerald-700'
                      : stg.active
                      ? 'text-orange-600 font-black'
                      : 'text-gray-400'
                  }`}
                >
                  {stg.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Items Summary */}
      <div className="bg-white rounded-3xl p-5 border border-orange-100 shadow-sm mb-4">
        <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3">
          Order Items
        </h2>

        <div className="divide-y divide-gray-100">
          {orderData.items.map((it: any, i: number) => (
            <div key={i} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
              <div>
                <span className="font-extrabold text-gray-900">{it.itemName}</span>
                <span className="text-orange-600 font-bold ml-1.5">× {it.quantity}</span>
                {it.specialInstruction && (
                  <div className="text-[11px] text-gray-500 italic mt-0.5">
                    Note: {it.specialInstruction}
                  </div>
                )}
              </div>
              <div className="font-bold text-gray-800">₹{it.itemPrice * it.quantity}</div>
            </div>
          ))}
        </div>

        <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between font-black text-sm text-gray-900">
          <span>Total Paid / Due</span>
          <span className="text-orange-600">₹{orderData.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Call Masi & Cancel Action Buttons */}
      <div className="space-y-2.5 mb-6">
        <a
          href="tel:9876543210"
          className="w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition active:scale-98"
        >
          <Phone className="w-4 h-4 text-emerald-400" />
          <span>Call Masi / Canteen Counter (+91 9876543210)</span>
        </a>

        {['PENDING_PAYMENT', 'PAYMENT_VERIFYING'].includes(status) && (
          <button
            onClick={handleCancelOrder}
            disabled={cancelling}
            className="w-full py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-2xl border border-rose-200 transition active:scale-98"
          >
            {cancelling ? 'Cancelling...' : '❌ Cancel This Order'}
          </button>
        )}
      </div>

      {/* UPI Modal */}
      <UpiPaymentModal
        isOpen={upiModalOpen}
        onClose={() => setUpiModalOpen(false)}
        orderNumber={orderData.orderNumber}
        total={orderData.total}
        upiId="canteen@upi"
        payeeName="Masi Canteen"
        onClaimPaid={handleClaimPayment}
        loading={claimLoading}
      />
    </div>
  );
}
