'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { FileText, Search, Filter, MapPin } from 'lucide-react';

export default function AdminOrdersLedgerPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const url = statusFilter ? `/admin/orders?status=${statusFilter}` : '/admin/orders';
      const res = await api.get(url);
      setOrders(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      <header className="bg-gray-900 text-white px-4 py-3 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="text-xs font-bold text-gray-400 hover:text-white">
              ← Dashboard
            </Link>
            <h1 className="font-black text-lg">Orders Ledger & Audit</h1>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-3xl border border-gray-200 shadow-2xs">
          <div className="text-sm font-extrabold text-gray-900">
            Total Orders: {orders.length}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-bold px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="READY">Ready</option>
            <option value="PREPARING">Preparing</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="PAYMENT_VERIFYING">Payment Verifying</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Ledger Table */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Table</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {orders.map((o) => (
                  <tr key={o._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-extrabold text-gray-900">#{o.orderNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{o.userId?.name}</div>
                      <div className="text-[10px] text-gray-500">{o.userId?.rollNumber}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-purple-700">T-{o.tableNumber}</td>
                    <td className="px-4 py-3">
                      {o.items.map((i: any) => `${i.itemName} (×${i.quantity})`).join(', ')}
                    </td>
                    <td className="px-4 py-3 font-extrabold text-gray-900">₹{o.total}</td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-800 text-[10px] font-bold px-2 py-1 rounded-md">
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-[11px]">
                      {new Date(o.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
