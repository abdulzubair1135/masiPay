'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useCart } from '../../../context/CartContext';
import { Clock, RotateCcw, ChevronRight, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function StudentOrdersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { addItem } = useCart();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/orders/my');
        setOrders(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [user]);

  const handleReorder = async (order: any) => {
    // Check menu items and add to cart
    order.items.forEach((item: any) => {
      addItem({
        _id: item.menuItemId,
        name: item.itemName,
        price: item.itemPrice,
        isVeg: true,
      }, item.quantity);
    });
    router.push('/checkout');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return <span className="bg-amber-100 text-amber-800 text-[11px] font-extrabold px-2.5 py-1 rounded-full">🟡 Pay Pending</span>;
      case 'PAYMENT_VERIFYING':
        return <span className="bg-purple-100 text-purple-800 text-[11px] font-extrabold px-2.5 py-1 rounded-full">🟣 Verifying</span>;
      case 'ACCEPTED':
        return <span className="bg-blue-100 text-blue-800 text-[11px] font-extrabold px-2.5 py-1 rounded-full">🔵 Accepted</span>;
      case 'PREPARING':
        return <span className="bg-orange-100 text-orange-800 text-[11px] font-extrabold px-2.5 py-1 rounded-full">🟠 Preparing</span>;
      case 'READY':
        return <span className="bg-emerald-100 text-emerald-800 text-[11px] font-extrabold px-2.5 py-1 rounded-full animate-bounce">🟢 Ready</span>;
      case 'DELIVERED':
      case 'COMPLETED':
        return <span className="bg-emerald-50 text-emerald-700 text-[11px] font-extrabold px-2.5 py-1 rounded-full">✅ Delivered</span>;
      case 'CANCELLED':
        return <span className="bg-rose-100 text-rose-800 text-[11px] font-extrabold px-2.5 py-1 rounded-full">❌ Cancelled</span>;
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <Clock className="w-16 h-16 text-gray-300 mx-auto mb-3" />
        <h2 className="text-xl font-extrabold text-gray-900">Please Login</h2>
        <p className="text-xs text-gray-500 mb-6">Login to view your order history and track live meals.</p>
        <Link
          href="/login"
          className="bg-orange-600 text-white font-bold px-6 py-3 rounded-2xl shadow-md inline-block"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-12">
      <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-4">
        {t('myOrders')}
      </h1>

      {loading ? (
        <div className="py-12 text-center">
          <div className="w-8 h-8 border-3 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-gray-500 mt-2">Loading your orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-gray-200">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-gray-800">{t('noOrdersYet')}</h3>
          <Link
            href="/menu"
            className="mt-4 inline-block bg-orange-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs"
          >
            Start Ordering
          </Link>
        </div>
      ) : (
        <div className="space-y-3.5">
          {orders.map((order) => {
            const dateFormatted = new Date(order.createdAt).toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={order._id}
                className="bg-white rounded-3xl p-5 border border-orange-100/80 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <div className="font-extrabold text-base text-gray-900">
                      Order #{order.orderNumber}
                    </div>
                    <div className="text-[11px] text-gray-500 font-medium">{dateFormatted}</div>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                {/* Items summary */}
                <div className="py-3 text-xs text-gray-700 space-y-1">
                  {order.items.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span>
                        {it.itemName} × {it.quantity}
                      </span>
                      <span className="font-semibold">₹{it.itemPrice * it.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="font-extrabold text-base text-gray-900">
                    Total: <span className="text-orange-600">₹{order.total}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReorder(order)}
                      className="flex items-center gap-1 text-xs font-bold text-gray-700 hover:text-orange-600 bg-gray-100 hover:bg-orange-50 px-3 py-1.5 rounded-xl transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t('orderAgain')}</span>
                    </button>

                    <Link
                      href={`/orders/${order._id}`}
                      className="flex items-center gap-1 text-xs font-extrabold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl transition"
                    >
                      <span>Track</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
