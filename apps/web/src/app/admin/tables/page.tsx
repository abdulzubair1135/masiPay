'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { MapPin, Plus, QrCode, RefreshCw, Printer, CheckCircle, Ban } from 'lucide-react';

export default function AdminTablesPage() {
  const { user } = useAuth();
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newCapacity, setNewCapacity] = useState(4);
  const [creating, setCreating] = useState(false);
  const [selectedTableForPrint, setSelectedTableForPrint] = useState<any>(null);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tables');
      setTables(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber.trim()) return;

    try {
      setCreating(true);
      await api.post('/admin/tables', {
        tableNumber: newTableNumber.trim(),
        capacity: Number(newCapacity),
      });
      setNewTableNumber('');
      fetchTables();
    } catch (err: any) {
      alert(err.message || 'Failed to create table');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (table: any) => {
    const newStatus = table.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await api.patch(`/admin/tables/${table._id}`, { status: newStatus });
      fetchTables();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRegenerateQR = async (tableId: string) => {
    if (!confirm('Regenerating QR will invalidate the old printed QR code. Continue?')) return;
    try {
      await api.post(`/admin/tables/${tableId}/regenerate-qr`, {});
      fetchTables();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      {/* Header */}
      <header className="bg-gray-900 text-white px-4 py-3 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="text-xs font-bold text-gray-400 hover:text-white">
              ← Dashboard
            </Link>
            <h1 className="font-black text-lg">Table QR Code Manager</h1>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Create Table Form */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm mb-6">
          <h2 className="text-base font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <Plus className="w-5 h-5 text-purple-600" />
            <span>Add New Canteen Table</span>
          </h2>

          <form onSubmit={handleCreateTable} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Table Number (e.g. 11, T-12)"
              value={newTableNumber}
              onChange={(e) => setNewTableNumber(e.target.value)}
              className="px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:border-purple-600 text-sm font-semibold"
            />
            <input
              type="number"
              min="1"
              max="20"
              placeholder="Seating Capacity (e.g. 4)"
              value={newCapacity}
              onChange={(e) => setNewCapacity(Number(e.target.value))}
              className="px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:border-purple-600 text-sm font-semibold"
            />
            <button
              type="submit"
              disabled={creating}
              className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold py-3 px-6 rounded-2xl shadow-md transition"
            >
              {creating ? 'Generating QR...' : 'Create & Generate QR'}
            </button>
          </form>
        </div>

        {/* Tables Grid */}
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tables.map((table) => {
              const isActive = table.status === 'ACTIVE';

              return (
                <div
                  key={table._id}
                  className={`bg-white rounded-3xl p-5 border-2 shadow-xs flex flex-col justify-between ${
                    isActive ? 'border-gray-200' : 'border-rose-200 bg-rose-50/20'
                  }`}
                >
                  <div className="text-center">
                    <div className="inline-flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full text-xs font-black text-gray-800 mb-2">
                      <MapPin className="w-3.5 h-3.5 text-purple-600" />
                      <span>TABLE {table.tableNumber}</span>
                    </div>

                    {/* QR Preview */}
                    <div className="my-3 p-3 bg-white border border-gray-200 rounded-2xl shadow-2xs inline-block">
                      <img
                        src={table.qrCodeUrl}
                        alt={`QR Table ${table.tableNumber}`}
                        className="w-36 h-36 mx-auto object-contain"
                      />
                    </div>

                    <div className="text-xs text-gray-500 font-bold">
                      Capacity: {table.capacity} Persons
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedTableForPrint(table)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 py-2 px-3 rounded-xl transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Card</span>
                    </button>

                    <button
                      onClick={() => handleRegenerateQR(table._id)}
                      className="p-2 text-gray-500 hover:text-purple-600 bg-gray-100 hover:bg-purple-50 rounded-xl transition"
                      title="Regenerate QR"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleToggleStatus(table)}
                      className={`p-2 rounded-xl text-xs font-bold transition ${
                        isActive
                          ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-rose-600 bg-rose-50 hover:bg-rose-100'
                      }`}
                      title={isActive ? 'Disable Table' : 'Enable Table'}
                    >
                      {isActive ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Printable QR Card Modal */}
      {selectedTableForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center border-4 border-orange-500 shadow-2xl">
            <div className="font-extrabold text-2xl text-orange-600 tracking-tight">
              MasiCanteen
            </div>
            <div className="text-xs text-gray-500 font-bold mb-4">
              "Order karo, Masi tak turant pahunchao."
            </div>

            <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-2xl py-2 px-6 rounded-2xl mb-4 inline-block shadow-md">
              TABLE {selectedTableForPrint.tableNumber}
            </div>

            <div className="p-3 bg-white border-2 border-gray-300 rounded-3xl shadow-inner my-2 inline-block">
              <img
                src={selectedTableForPrint.qrCodeUrl}
                alt="Table QR"
                className="w-52 h-52 mx-auto"
              />
            </div>

            <div className="text-xs font-extrabold text-gray-800 mt-3">
              📱 SCAN TO ORDER FOOD
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              Open Camera / Google Lens & Scan QR Code
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-orange-600 text-white font-extrabold py-3 rounded-2xl"
              >
                Print Now
              </button>
              <button
                onClick={() => setSelectedTableForPrint(null)}
                className="bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-2xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
