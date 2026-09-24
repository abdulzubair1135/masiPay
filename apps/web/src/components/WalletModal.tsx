'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Wallet, PlusCircle, CheckCircle2, ArrowUpRight, Zap, X, ShieldCheck } from 'lucide-react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderTotal?: number;
  orderId?: string;
  onPaymentSuccess?: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  orderTotal,
  orderId,
  onPaymentSuccess,
}) => {
  const { user, updateUser } = useAuth();
  const [balance, setBalance] = useState<number>(user?.walletBalance || 0);
  const [loading, setLoading] = useState<boolean>(false);
  const [paying, setPaying] = useState<boolean>(false);
  const [rechargeAmount, setRechargeAmount] = useState<number>(500);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchWallet();
    }
  }, [isOpen]);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const res = await api.get('/wallet/details');
      if (res.data.success) {
        setBalance(res.data.data.balance);
        setTransactions(res.data.data.transactions || []);
        updateUser({ walletBalance: res.data.data.balance });
      }
    } catch (err: any) {
      console.error('Wallet fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async (amt: number) => {
    try {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      const res = await api.post('/wallet/recharge', {
        amount: amt,
        reference: `UPI-TOPUP-${Date.now().toString().slice(-6)}`,
      });
      if (res.data.success) {
        setBalance(res.data.data.balance);
        updateUser({ walletBalance: res.data.data.balance });
        setSuccessMsg(`🎉 ₹${amt} added to SRK Wallet!`);
        fetchWallet();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to recharge wallet');
    } finally {
      setLoading(false);
    }
  };

  const handlePayOrder = async () => {
    if (!orderId) return;
    try {
      setPaying(true);
      setErrorMsg('');
      const res = await api.post('/wallet/pay', { orderId });
      if (res.data.success) {
        setBalance(res.data.data.walletBalance);
        updateUser({ walletBalance: res.data.data.walletBalance });
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  if (!isOpen) return null;

  const hasEnough = orderTotal !== undefined ? balance >= orderTotal : true;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-orange-100 animate-in slide-in-from-bottom sm:zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-6 h-6 text-amber-200" />
            <span className="text-xs uppercase font-black tracking-wider text-orange-200">SRK Student Wallet</span>
          </div>
          <div className="text-3xl font-black tracking-tight">₹{balance.toFixed(2)}</div>
          <p className="text-xs text-orange-100 font-medium mt-1">1-Click zero-wait canteen orders</p>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* If paying for an order */}
          {orderTotal !== undefined && (
            <div className="p-4 bg-orange-50 rounded-2xl border-2 border-orange-200 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                <span>Order Total:</span>
                <span className="text-base font-black text-orange-600">₹{orderTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Current Balance:</span>
                <span className={hasEnough ? 'text-emerald-700' : 'text-rose-600'}>
                  ₹{balance.toFixed(2)} {hasEnough ? '(Sufficient)' : '(Low Balance)'}
                </span>
              </div>

              {hasEnough ? (
                <button
                  onClick={handlePayOrder}
                  disabled={paying}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>{paying ? 'Deducting & Placing Order...' : `⚡ Pay ₹${orderTotal.toFixed(2)} from SRK Wallet`}</span>
                </button>
              ) : (
                <div className="text-[11px] text-rose-600 font-bold bg-white p-2.5 rounded-xl border border-rose-200">
                  ⚠️ Need ₹{(orderTotal - balance).toFixed(2)} more. Recharge below to pay with 1-click!
                </div>
              )}
            </div>
          )}

          {/* Quick Recharge Section */}
          <div className="space-y-2">
            <div className="text-xs font-black text-gray-700 flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-orange-600" />
              <span>Quick Top-up / Monthly Recharge</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[100, 200, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleRecharge(amt)}
                  disabled={loading}
                  className="py-2.5 px-2 bg-gray-50 hover:bg-orange-50 hover:border-orange-400 border border-gray-200 rounded-2xl text-center text-xs font-black text-gray-800 transition active:scale-95 disabled:opacity-50"
                >
                  +₹{amt}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 text-center font-medium">
              Simulated instant recharge for testing & daily use
            </p>
          </div>

          {/* Recent Wallet History */}
          {transactions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="text-xs font-black text-gray-600">Recent Wallet Activity</div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {transactions.slice(0, 5).map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl text-[11px]">
                    <div className="truncate pr-2">
                      <div className="font-bold text-gray-800 truncate">{t.description}</div>
                      <div className="text-[9px] text-gray-400">{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <span className={`font-black shrink-0 ${t.amount > 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                      {t.amount > 0 ? `+₹${t.amount}` : `-₹${Math.abs(t.amount)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>SRK Canteen Secure Student Wallet</span>
          </div>
        </div>
      </div>
    </div>
  );
};
