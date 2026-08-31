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
  MapPin,
  FileText,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, table, setTable, updateQuantity, removeItem, updateInstruction, clearCart, subtotal, total } = useCart();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [orderNotes, setOrderNotes] = useState('');
  const [canteenSettings, setCanteenSettings] = useState<any>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [availableTables, setAvailableTables] = useState<any[]>([]);

  useEffect(() => {
    async function loadInitial() {
      try {
        const [tablesRes] = await Promise.all([
          api.get('/tables'),
        ]);
        setAvailableTables(tablesRes.data.data);
      } catch (err) {}
    }
    loadInitial();
  }, []);

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;

    if (!user) {
      router.push('/login?redirect=/checkout');
      return;
    }

    if (!table?.secureToken) {
      alert('Please select a Table number first before placing an order!');
      return;
    }

    try {
      setPlacingOrder(true);
      const payload = {
        tableToken: table.secureToken,
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          specialInstruction: i.specialInstruction,
        })),
        notes: orderNotes,
        idempotencyKey: `order_${user._id}_${Date.now()}`,
      };

      const res = await api.post('/orders', payload);
      const newOrder = res.data.data;
      setCreatedOrder(newOrder);
      setUpiModalOpen(true);
      clearCart();
    } catch (err: any) {
      alert(err.message || 'Failed to place order. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleClaimPaid = async (transactionRef?: string) => {
    if (!createdOrder) return;
    try {
      setClaimLoading(true);
      await api.post(`/orders/${createdOrder._id}/payment-claimed`, {
        transactionReference: transactionRef,
      });

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });

      setUpiModalOpen(false);
      router.push(`/orders/${createdOrder._id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to submit payment verification.');
    } finally {
      setClaimLoading(false);
    }
  };

  if (items.length === 0 && !createdOrder) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Your Cart is Empty</h2>
        <p className="text-xs text-gray-500 mb-6">
          Delicious burgers, thalis, and cutting chai are waiting for you!
        </p>
        <button
          onClick={() => router.push('/menu')}
          className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-6 py-3.5 rounded-2xl shadow-lg shadow-orange-600/30 transition"
        >
          Explore Food Menu
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-12">
      <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-4">
        {t('yourOrder')}
      </h1>

      {/* Table Selector Box */}
      <div className="bg-white rounded-3xl p-4 border border-orange-100 shadow-sm mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-bold">{t('table')}</div>
              <div className="text-sm font-extrabold text-gray-900">
                {table?.tableNumber ? `Table ${table.tableNumber}` : 'No Table Selected'}
              </div>
            </div>
          </div>

          <select
            value={table?.secureToken || ''}
            onChange={(e) => {
              const selected = availableTables.find((t) => t.secureToken === e.target.value);
              if (selected) {
                setTable({
                  tableId: selected._id,
                  tableNumber: selected.tableNumber,
                  secureToken: selected.secureToken,
                });
              }
            }}
            className="text-xs font-bold bg-orange-50 text-orange-700 px-3 py-2 rounded-xl border border-orange-200 focus:outline-none"
          >
            <option value="" disabled>
              Select Table
            </option>
            {availableTables.map((t) => (
              <option key={t._id} value={t.secureToken}>
                Table {t.tableNumber}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="bg-white rounded-3xl p-4 border border-orange-100 shadow-sm mb-4 divide-y divide-gray-100">
        {items.map((item) => (
          <div key={item.menuItemId} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}
                  />
                  <h4 className="font-extrabold text-sm text-gray-900">{item.name}</h4>
                </div>
                <div className="text-xs font-bold text-gray-700 mt-0.5">
                  ₹{item.price} × {item.quantity} = ₹{item.price * item.quantity}
                </div>
              </div>

              {/* Quantity Controllers */}
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-2 py-1">
                <button
                  onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                  className="w-6 h-6 rounded-lg bg-white text-orange-600 flex items-center justify-center font-bold shadow-2xs"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-extrabold text-xs text-orange-950 w-4 text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                  className="w-6 h-6 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold shadow-2xs"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Special Instructions */}
            <input
              type="text"
              placeholder={t('specialInstruction')}
              value={item.specialInstruction || ''}
              onChange={(e) => updateInstruction(item.menuItemId, e.target.value)}
              className="w-full mt-2 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-orange-400"
            />
          </div>
        ))}
      </div>

      {/* Bill Details */}
      <div className="bg-white rounded-3xl p-5 border border-orange-100 shadow-sm mb-5 space-y-2">
        <div className="flex justify-between text-xs text-gray-600 font-medium">
          <span>{t('subtotal')}</span>
          <span>₹{subtotal}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-600 font-medium">
          <span>{t('tax')}</span>
          <span>₹0</span>
        </div>
        <div className="pt-2 border-t border-gray-100 flex justify-between text-base font-extrabold text-gray-900">
          <span>{t('total')}</span>
          <span className="text-orange-600 text-lg">₹{total}</span>
        </div>
      </div>

      {/* Place Order CTA */}
      <button
        onClick={handlePlaceOrder}
        disabled={placingOrder}
        className="w-full flex items-center justify-between bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold py-4 px-6 rounded-2xl shadow-xl shadow-orange-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
      >
        <span>₹{total} • {t('placeOrder')}</span>
        <ArrowRight className="w-5 h-5" />
      </button>

      {/* UPI Payment Modal */}
      {createdOrder && (
        <UpiPaymentModal
          isOpen={upiModalOpen}
          onClose={() => setUpiModalOpen(false)}
          orderNumber={createdOrder.orderNumber}
          total={createdOrder.total}
          upiId="canteen@upi"
          payeeName="Masi Canteen Services"
          onClaimPaid={handleClaimPaid}
          loading={claimLoading}
        />
      )}
    </div>
  );
}
