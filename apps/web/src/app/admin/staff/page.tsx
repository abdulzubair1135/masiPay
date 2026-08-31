'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { Users, UserPlus, Shield, ChefHat, CheckCircle, Ban } from 'lucide-react';

export default function AdminStaffPage() {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'STAFF' | 'STUDENT'>('STAFF');

  // New staff modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPassword, setStaffPassword] = useState('Masi@12345');
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/users?role=${tab}`);
      setUsersList(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [tab]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await api.post('/admin/staff', {
        name: staffName,
        email: staffEmail || undefined,
        phone: staffPhone,
        password: staffPassword,
        role: 'STAFF',
      });
      setIsModalOpen(false);
      setStaffName('');
      setStaffEmail('');
      setStaffPhone('');
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to create staff member');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleUserStatus = async (u: any) => {
    const newStatus = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.patch(`/admin/users/${u._id}`, { status: newStatus });
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      <header className="bg-gray-900 text-white px-4 py-3 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="text-xs font-bold text-gray-400 hover:text-white">
              ← Dashboard
            </Link>
            <h1 className="font-black text-lg">Staff & Student Management</h1>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Staff</span>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('STAFF')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition ${
              tab === 'STAFF'
                ? 'bg-purple-700 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-200'
            }`}
          >
            Kitchen Staff
          </button>
          <button
            onClick={() => setTab('STUDENT')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition ${
              tab === 'STUDENT'
                ? 'bg-purple-700 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-200'
            }`}
          >
            Registered Students
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xs divide-y divide-gray-100 overflow-hidden">
            {usersList.map((u) => {
              const isActive = u.status === 'ACTIVE';

              return (
                <div key={u._id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={u.profileImage || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                      alt={u.name}
                      className="w-10 h-10 rounded-full border object-cover"
                    />
                    <div>
                      <div className="font-extrabold text-sm text-gray-900">{u.name}</div>
                      <div className="text-xs text-gray-500">
                        {u.role === 'STUDENT' ? `Roll: ${u.rollNumber}` : u.email || u.phone}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${
                        isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {u.status}
                    </span>

                    <button
                      onClick={() => handleToggleUserStatus(u)}
                      className={`p-2 rounded-xl text-xs font-bold transition ${
                        isActive
                          ? 'text-rose-600 hover:bg-rose-50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={isActive ? 'Suspend User' : 'Activate User'}
                    >
                      {isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full">
            <h2 className="text-xl font-extrabold text-gray-900 mb-4">Add Kitchen Staff</h2>
            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="e.g. Ramesh Bhai (Cook)"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="staff@masicanteen.com"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Login Password *</label>
                <input
                  type="text"
                  required
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm font-semibold"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-purple-700 text-white font-extrabold py-3 rounded-xl"
                >
                  {creating ? 'Adding...' : 'Create Staff Member'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
