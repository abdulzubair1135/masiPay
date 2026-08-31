'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { api } from '../../../lib/api';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  QrCode,
  ArrowRight,
  Banknote,
  Smartphone,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, table, updateQuantity, removeItem, updateInstruction, clearCart, subtotal, total } = useCart();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI'>('CASH');
  const [orderNotes, setOrderNotes] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);

  const handlePlaceOrderDirect = async () => {
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

      // 1. Create Order
      const res = await api.post('/orders', payload);
      const order = res.data.data;

      // 2. Automatically claim payment (Bypass / Instant Token)
      try {
        await api.post(`/orders/${order._id}/claim-payment`, {
          transactionReference: paymentMode === 'CASH' ? 'CASH_AT_COUNTER' : 'UPI_DIRECT',
          paymentMethod: paymentMode === 'CASH' ? 'CASH' : 'UPI_MANUAL',
        });
      } catch (e) {
        // Fallback route
        await api.post(`/orders/${order._id}/payment-claimed`, {
          transactionReference: paymentMode === 'CASH' ? 'CASH_AT_COUNTER' : 'UPI_DIRECT',
          paymentMethod: paymentMode === 'CASH' ? 'CASH' : 'UPI_MANUAL',
        });
      }

      // 3. Clear Tray & Go Straight to Live Tracking
      clearCart();
      router.push(`/orders/${order._id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to place order. Please try again.');
      setPlacingOrder(false);
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
          className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-6 py-3 rounded-2xl shadow-md transition text-xs"
        >
          Explore Food Menu
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-36">
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

      {/* Dynamic Token Banner */}
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
              Dynamic Personal Token QR will be generated
            </div>
          </div>
        </div>
      </div>

      {/* Ordered Items List */}
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

      {/* Payment Mode Selector */}
      <div className="bg-white rounded-3xl p-4 border border-orange-100 shadow-sm mb-4">
        <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3">
          Choose Payment Mode
        </h2>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setPaymentMode('CASH')}
            className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
              paymentMode === 'CASH'
                ? 'border-emerald-500 bg-emerald-50/50 shadow-md shadow-emerald-500/10'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <Banknote className={`w-5 h-5 ${paymentMode === 'CASH' ? 'text-emerald-600' : 'text-gray-400'}`} />
              {paymentMode === 'CASH' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            </div>
            <div className="text-xs font-black text-gray-900">Cash at Counter</div>
            <div className="text-[10px] text-gray-500 font-bold">Pay directly to Masi</div>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMode('UPI')}
            className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
              paymentMode === 'UPI'
                ? 'border-orange-500 bg-orange-50/50 shadow-md shadow-orange-500/10'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <Smartphone className={`w-5 h-5 ${paymentMode === 'UPI' ? 'text-orange-600' : 'text-gray-400'}`} />
              {paymentMode === 'UPI' && <CheckCircle2 className="w-4 h-4 text-orange-600" />}
            </div>
            <div className="text-xs font-black text-gray-900">UPI Online</div>
            <div className="text-[10px] text-gray-500 font-bold">GPay / PhonePe / Paytm</div>
          </button>
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

      {/* 1-Click Instant Confirm CTA */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-gray-200 z-30 max-w-md mx-auto shadow-2xl">
        <button
          onClick={handlePlaceOrderDirect}
          disabled={placingOrder}
          className={`w-full flex items-center justify-between text-white font-black py-4 px-6 rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 ${
            paymentMode === 'CASH'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 shadow-emerald-600/30'
              : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 shadow-orange-600/30'
          }`}
        >
          <div className="text-left">
            <div className="text-[10px] text-white/80 uppercase tracking-wider font-bold">
              {paymentMode === 'CASH' ? '💵 Cash at Counter' : '📱 UPI Payment'}
            </div>
            <div className="text-base font-black">₹{total.toFixed(2)}</div>
          </div>
          <div className="flex items-center gap-2">
            <span>{placingOrder ? 'Generating Token...' : 'Confirm & Get Token'}</span>
            <ArrowRight className="w-5 h-5" />
          </div>
        </button>
      </div>
    </div>
  );
}
