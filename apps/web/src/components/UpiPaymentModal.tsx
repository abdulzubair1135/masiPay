'use client';

import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, CheckCircle, ShieldCheck, QrCode, Smartphone, ArrowRight } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: number;
  total: number;
  upiId?: string;
  payeeName?: string;
  onClaimPaid: (transactionRef?: string) => Promise<void>;
  loading?: boolean;
}

export const UpiPaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  orderNumber,
  total,
  upiId = 'canteen@upi',
  payeeName = 'Masi Canteen Services',
  onClaimPaid,
  loading = false,
}) => {
  const { t } = useLanguage();
  const [transactionRef, setTransactionRef] = useState('');
  const [showRefInput, setShowRefInput] = useState(false);

  if (!isOpen) return null;

  // Standard UPI URI format
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${total}&tn=${encodeURIComponent(`Order #${orderNumber}`)}&cu=INR`;

  // QR Code generator URL using public QR server for instant rendering
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    upiUri
  )}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onClaimPaid(transactionRef || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-orange-100 animate-in slide-in-from-bottom-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <div className="text-xs font-bold text-orange-600 uppercase tracking-wider">
              Order #{orderNumber}
            </div>
            <h3 className="text-2xl font-extrabold text-gray-900">
              Pay ₹{total} via UPI
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code section */}
        <div className="my-5 flex flex-col items-center justify-center bg-orange-50/50 rounded-2xl p-5 border border-orange-100">
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-orange-200">
            <img
              src={qrImageSrc}
              alt="Scan UPI QR"
              className="w-48 h-48 rounded-lg object-contain"
            />
          </div>

          <div className="mt-3 text-center">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              UPI ID
            </div>
            <div className="text-sm font-extrabold text-gray-900 bg-white px-3 py-1 rounded-full border border-orange-200 mt-1 inline-block select-all">
              {upiId}
            </div>
            <div className="text-xs text-gray-600 mt-1">({payeeName})</div>
          </div>
        </div>

        {/* Deep Link Buttons for Mobile */}
        <div className="space-y-2 mb-5">
          <a
            href={upiUri}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white font-bold py-3.5 px-4 rounded-2xl transition shadow-md"
          >
            <Smartphone className="w-5 h-5" />
            <span>Open UPI App (GPay / PhonePe / Paytm)</span>
          </a>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-2.5 bg-amber-50 text-amber-900 text-xs p-3 rounded-2xl border border-amber-200 mb-5">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p>
            Payment karne ke baad neeche <strong>"I HAVE PAID"</strong> dabayein. Masi apne GPay/UPI mein check karke turant order confirm karegi.
          </p>
        </div>

        {/* Claim Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {showRefInput ? (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                UPI Reference / UTR Number (Optional)
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. 423984729182"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm font-medium"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowRefInput(true)}
              className="text-xs text-orange-600 font-semibold hover:underline block text-center w-full"
            >
              + Add UTR / Reference No (Optional)
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold py-4 px-6 rounded-2xl text-base shadow-lg shadow-orange-600/30 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <CheckCircle className="w-5 h-5" />
            <span>{loading ? 'Processing...' : t('iHavePaid')}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
