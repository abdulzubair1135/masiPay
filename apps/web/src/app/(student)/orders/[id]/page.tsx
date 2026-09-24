'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import { getSocket } from '../../../../lib/socket';
import { useLanguage } from '../../../../context/LanguageContext';
import { OrderTimerBadge } from '../../../../components/OrderTimerBadge';
import { UpiPaymentModal } from '../../../../components/UpiPaymentModal';
import { playFoodReadySiren } from '../../../../lib/sound';
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
  Megaphone,
  X,
  Wallet,
  MessageSquare,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { WalletModal } from '../../../components/WalletModal';

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
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [tokenQrDataUrl, setTokenQrDataUrl] = useState<string>('');
  const [activeAlert, setActiveAlert] = useState<any>(null);
  const [showSirenModal, setShowSirenModal] = useState(false);

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
          setOrderData((prev: any) => (prev ? {
            ...prev,
            status: data.newStatus,
            pickupCounter: data.pickupCounter || prev.pickupCounter
          } : prev));
          if (data.newStatus === 'READY') {
            playFoodReadySiren();
            setShowSirenModal(true);
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
          } else if (data.newStatus === 'DELIVERED') {
            setShowSirenModal(false);
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
          playFoodReadySiren();
          setShowSirenModal(true);
          confetti({ particleCount: 80, spread: 70 });
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

  // 5-minute repeating siren reminder if food is READY and student has not collected
  useEffect(() => {
    let reminderInterval: any = null;
    if (orderData?.status === 'READY') {
      reminderInterval = setInterval(() => {
        playFoodReadySiren();
        setShowSirenModal(true);
      }, 5 * 60 * 1000); // 5 minutes
    }
    return () => {
      if (reminderInterval) clearInterval(reminderInterval);
    };
  }, [orderData?.status]);

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
          className="bg-orange-600 text-white font-bold px-6 py-3 rounded-2xl text-xs"
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
    { key: 'PENDING_PAYMENT', label: 'Order Placed', icon: Clock },
    { key: 'PAYMENT_VERIFYING', label: 'Payment Verifying', icon: CreditCard },
    { key: 'ACCEPTED', label: 'Order Accepted', icon: CheckCircle2 },
    { key: 'PREPARING', label: 'Cooking in Kitchen', icon: ChefHat },
    { key: 'READY', label: 'Ready for Pickup', icon: BellRing },
    { key: 'DELIVERED', label: 'Delivered', icon: Sparkles },
  ];

  const getStageIndex = (s: string) => {
    switch (s) {
      case 'PENDING_PAYMENT': return 0;
      case 'PAYMENT_VERIFYING': return 1;
      case 'ACCEPTED': return 2;
      case 'PREPARING': return 3;
      case 'READY': return 4;
      case 'DELIVERED':
      case 'COMPLETED': return 5;
      default: return 0;
    }
  };

  const currentStageIndex = getStageIndex(status);

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-20">
      {/* Back Button */}
      <button
        onClick={() => router.push('/orders')}
        className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-900 mb-3"
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
              Kitchen Alert / मासी का संदेश
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
                className="w-48 h-48 mx-auto rounded-2xl"
              />
            </div>
          </div>
        )}

        {/* Counter Ready Highlight Badge */}
        {orderData.status === 'READY' && (
          <div className="mb-4 p-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl shadow-lg animate-pulse">
            <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-100">
              🔔 Food Ready! Collect from:
            </div>
            <div className="text-xl font-black">
              📍 {orderData.pickupCounter || 'Counter A'}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2">
          <OrderTimerBadge createdAt={orderData.createdAt} />
        </div>

        {/* Payment Action Buttons for Unpaid Orders */}
        {['PENDING_PAYMENT', 'PAYMENT_VERIFYING'].includes(status) && (
          <div className="mt-4 pt-4 border-t border-orange-100 space-y-2">
            <button
              onClick={() => setWalletModalOpen(true)}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition active:scale-95"
            >
              <Wallet className="w-4 h-4 text-amber-100" />
              <span>⚡ Pay ₹{orderData.total.toFixed(2)} with SRK Wallet (1-Click)</span>
            </button>

            <button
              onClick={() => setUpiModalOpen(true)}
              className="w-full py-3 bg-white hover:bg-orange-50 text-orange-700 border-2 border-orange-300 rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-2xs transition active:scale-95"
            >
              <CreditCard className="w-4 h-4 text-orange-600" />
              <span>📱 Pay via UPI QR / GPay / PhonePe</span>
            </button>
          </div>
        )}

        {/* WhatsApp Ready Alert Link */}
        {status === 'READY' && (
          <div className="mt-4 pt-4 border-t border-emerald-100">
            <a
              href={orderData.whatsappAlertUrl || `https://wa.me/?text=${encodeURIComponent(`🎉 SRK Canteen: Order Token #${orderData.orderNumber} is READY at ${orderData.pickupCounter || 'Counter A'}!`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95"
            >
              <MessageSquare className="w-4 h-4 text-white" />
              <span>📲 Open WhatsApp Ready Alert</span>
            </a>
          </div>
        )}
      </div>

      {/* Live Order Status Pipeline Card */}
      <div className="bg-white rounded-3xl p-5 border border-orange-100 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
            Live Kitchen Progress
          </h2>
          <span className="text-xs font-black px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 uppercase">
            {status}
          </span>
        </div>

        {/* Vertical Pipeline Steps */}
        <div className="space-y-4">
          {stages.slice(0, 5).map((stage, idx) => {
            const isCompleted = currentStageIndex > idx;
            const isCurrent = currentStageIndex === idx;
            const Icon = stage.icon;

            return (
              <div key={stage.key} className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : isCurrent
                      ? 'bg-orange-600 text-white ring-4 ring-orange-100 animate-pulse'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="pt-1 flex-1">
                  <div
                    className={`text-xs font-extrabold ${
                      isCurrent
                        ? 'text-orange-600 text-sm'
                        : isCompleted
                        ? 'text-gray-900'
                        : 'text-gray-400'
                    }`}
                  >
                    {stage.label}
                  </div>
                  {isCurrent && status === 'PREPARING' && (
                    <div className="text-[11px] text-gray-500 font-medium mt-0.5">
                      🍳 Masi is currently cooking your hot food in the kitchen.
                    </div>
                  )}
                  {isCurrent && status === 'READY' && (
                    <div className="text-[11px] text-emerald-600 font-extrabold mt-0.5 animate-bounce">
                      🔔 Khana {orderData.pickupCounter || 'Counter'} par rakha hai! Token #{orderData.orderNumber} dikhakar le lein!
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ordered Items Summary */}
      <div className="bg-white rounded-3xl p-5 border border-orange-100 shadow-sm mb-4">
        <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3">
          Order Summary ({orderData.items?.length || 0} items)
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

      {/* 🚨 Fullscreen LOUD SIREN Food Ready Emergency Modal */}
      {showSirenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-in fade-in backdrop-blur-md">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center relative shadow-2xl border-4 border-emerald-500 animate-in zoom-in-95">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 animate-bounce shadow-lg shadow-emerald-500/20">
              <Megaphone className="w-10 h-10" />
            </div>

            <div className="inline-block bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider mb-2">
              🔔 Siren Alert / खाना तैयार है!
            </div>

            <h2 className="text-2xl font-black text-gray-900">
              आजाओ काउंटर पर!
            </h2>

            <div className="my-3 p-3 bg-orange-50 rounded-2xl border-2 border-orange-300">
              <div className="text-xs text-orange-800 font-bold">Aapka Order Token</div>
              <div className="text-3xl font-black text-orange-600">TOKEN #{orderData.orderNumber}</div>
              <div className="mt-2 pt-2 border-t border-orange-200 text-sm font-black text-emerald-700 flex items-center justify-center gap-1">
                <span>📍 Rakha Hai:</span>
                <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-lg">{orderData.pickupCounter || 'Counter A'}</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 font-bold mb-5">
              {activeAlert?.message || `Masi ne aapka khana ${orderData.pickupCounter || 'Counter'} par rakh diya hai. Jaldi se jakar Token dikhayein aur khana lein!`}
            </p>

            <button
              onClick={() => setShowSirenModal(false)}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-black text-xs rounded-2xl shadow-xl shadow-emerald-600/30 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>🚀 Main {orderData.pickupCounter || 'Counter'} Par Jaa Raha Hoon!</span>
            </button>
          </div>
        </div>
      )}

      {/* UPI Modal */}
      <UpiPaymentModal
        isOpen={upiModalOpen}
        onClose={() => setUpiModalOpen(false)}
        orderNumber={orderData.orderNumber}
        total={orderData.total}
        upiId="abdulzubair221-1@okaxis"
        payeeName="Abdul Zubair"
        onClaimPaid={handleClaimPayment}
        loading={claimLoading}
      />

      {/* SRK Student Wallet Modal */}
      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        orderTotal={orderData.total}
        orderId={orderData._id}
        onPaymentSuccess={fetchOrderDetails}
      />
    </div>
  );
}
