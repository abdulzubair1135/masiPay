'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { api } from '../../../lib/api';
import { UpiPaymentModal } from '../../../components/UpiPaymentModal';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  QrCode,
  FileText,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, table, setTable, updateQuantity, removeItem, updateInstruction, clearCart, subtotal, total } = useCart();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [orderNotes, setOrderNotes] = useState('');
  const [canteenSettings, setCanteenSettings] = useState<any>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.get('/admin/settings');
        setCanteenSettings(res.data.data);
      } catch (err) {}
    }
    loadSettings();
  }, []);

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;

    if (!user) {
      router.push('/login?redirect=/checkout');
      return;
    }

    try {
      setPlacingOrder(true);
      const payload = {
        tableToken: table?.secureToken || undefined,
        tableNumber: table?.tableNumber || undefined,
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          specialInstruction: i.specialInstruction,
        })),
        notes: orderNotes.trim() || undefined,
      };

      const res = await api.post('/orders', payload);
      const order = res.data.data;
      setCreatedOrder(order);
      setUpiModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to place order. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handlePaymentClaimed = async (
    transactionRef?: string,
    paymentMethod?: 'UPI_MANUAL' | 'CASH',
    proofImage?: string
  ) => {
    if (!createdOrder) return;
    try {
      setClaimLoading(true);
      await api.post(`/orders/${createdOrder._id}/claim-payment`, {
        transactionReference: transactionRef || undefined,
        paymentMethod: paymentMethod || 'UPI_MANUAL',
        proofImage: proofImage || undefined,
      });
      clearCart();
      setUpiModalOpen(false);
      router.push(`/orders/${createdOrder._id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to submit payment claim');
    } finally {
      setClaimLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-gray-900 mb-1">{t('cartEmpty')}</h2>
        <p className="text-xs text-gray-500 mb-6">Your tray is empty. Explore tasty snacks and hot meals!</p>
        <button
          onClick={() => router.push('/menu')}
          className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-6 py-3 rounded-2xl shadow-md transition"
        >
          Explore Food Menu
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
          Review Order
        </h1>
        <button
          onClick={clearCart}
          className="text-xs font-bold text-rose-600 hover:text-rose-800 transition flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Tray</span>
        </button>
      </div>

      {/* Dynamic Token Badge */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 rounded-3xl shadow-sm mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-orange-100 uppercase tracking-wider">
              Self-Pickup Token
            </div>
            <div className="text-sm font-extrabold">
              Personal Dynamic Token QR will be generated
            </div>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white rounded-3xl p-4 border border-orange-100 shadow-sm mb-4 space-y-4">
        <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
          Ordered Items ({items.length})
        </h2>

        <div className="divide-y divide-gray-100">
          {items.map((item) => (
            <div key={item.menuItemId} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                      item.isVeg ? 'border-emerald-600' : 'border-rose-600'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-900 leading-snug">
                      {item.name}
                    </h3>
                    <div className="text-xs text-orange-600 font-bold">
                      ₹{item.price} each
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-orange-50 p-1 rounded-xl">
                  <button
                    onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                    className="w-7 h-7 rounded-lg bg-white text-orange-700 flex items-center justify-center shadow-xs hover:bg-orange-100 transition active:scale-90"
                  >
                    {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-rose-600" /> : <Minus className="w-3.5 h-3.5" />}
                  </button>
                  <span className="font-extrabold text-xs text-orange-950 w-4 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                    className="w-7 h-7 rounded-lg bg-white text-orange-700 flex items-center justify-center shadow-xs hover:bg-orange-100 transition active:scale-90"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Special instruction */}
              <input
                type="text"
                placeholder="Special notes (e.g. less spicy, no onion)..."
                value={item.specialInstruction || ''}
                onChange={(e) => updateInstruction(item.menuItemId, e.target.value)}
                className="w-full mt-2 text-xs bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 focus:outline-hidden focus:border-orange-400"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bill Breakdown */}
      <div className="bg-white rounded-3xl p-5 border border-orange-100 shadow-sm mb-6 space-y-2">
        <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">
          Bill Summary
        </h2>
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>{t('subtotal')}</span>
          <span className="font-bold">₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Canteen Service & Platform Fee</span>
          <span className="font-bold text-emerald-600">FREE</span>
        </div>
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-base font-black text-gray-900">
          <span>{t('total')}</span>
          <span className="text-orange-600">₹{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Place Order CTA */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-200 z-30 max-w-md mx-auto">
        <button
          onClick={handlePlaceOrder}
          disabled={placingOrder}
          className="w-full flex items-center justify-between bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold py-4 px-6 rounded-2xl shadow-xl shadow-orange-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <div className="text-left">
            <div className="text-[10px] text-orange-200 uppercase tracking-wider font-bold">
              Pay via UPI & Get Token
            </div>
            <div className="text-base font-black">₹{total.toFixed(2)}</div>
          </div>
          <div className="flex items-center gap-2">
            <span>{placingOrder ? 'Creating Token...' : 'Get Token & Pay'}</span>
            <ArrowRight className="w-5 h-5" />
          </div>
        </button>
      </div>

      {/* UPI Payment Modal */}
      {createdOrder && (
        <UpiPaymentModal
          isOpen={upiModalOpen}
          onClose={() => setUpiModalOpen(false)}
          orderNumber={createdOrder.orderNumber}
          total={createdOrder.total}
          upiId={canteenSettings?.upiId || 'canteen@upi'}
          payeeName={canteenSettings?.canteenName || 'Masi Canteen'}
          onClaimPaid={handlePaymentClaimed}
          loading={claimLoading}
        />
      )}
    </div>
  );
}
