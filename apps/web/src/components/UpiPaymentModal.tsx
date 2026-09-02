'use client';

import React, { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  X,
  CheckCircle,
  ShieldCheck,
  QrCode,
  Smartphone,
  ArrowRight,
  Banknote,
  Camera,
  RefreshCw,
  Upload,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: number;
  total: number;
  upiId?: string;
  payeeName?: string;
  onClaimPaid: (
    transactionRef?: string,
    paymentMethod?: 'UPI_MANUAL' | 'CASH',
    proofImage?: string
  ) => Promise<void>;
  loading?: boolean;
}

export const UpiPaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  orderNumber,
  total,
  upiId = 'abdulzubair221-1@okaxis',
  payeeName = 'Abdul Zubair',
  onClaimPaid,
  loading = false,
}) => {
  const { t, language } = useLanguage();
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'CASH'>('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [cashProofImage, setCashProofImage] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Standard UPI URI format
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${total}&tn=${encodeURIComponent(`Token #${orderNumber}`)}&cu=INR`;

  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    upiUri
  )}`;

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 400, height: 400 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera error fallback:', err);
      setIsCameraActive(false);
      fileInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const takeCashProofPhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCashProofImage(dataUrl);
    }
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCashProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMode === 'CASH') {
      await onClaimPaid('CASH_AT_COUNTER', 'CASH', cashProofImage || undefined);
    } else {
      await onClaimPaid(transactionRef || undefined, 'UPI_MANUAL', undefined);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-orange-100 animate-in slide-in-from-bottom-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <div className="text-xs font-bold text-orange-600 uppercase tracking-wider">
              Token #{orderNumber}
            </div>
            <h3 className="text-xl font-black text-gray-900">
              Total Due: ₹{total}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Payment Method Switch Tabs */}
        <div className="bg-gray-100 p-1 rounded-2xl flex items-center my-4">
          <button
            type="button"
            onClick={() => setPaymentMode('UPI')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
              paymentMode === 'UPI'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>UPI Online</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMode('CASH')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
              paymentMode === 'CASH'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>Cash at Counter</span>
          </button>
        </div>

        {paymentMode === 'UPI' ? (
          /* UPI Mode */
          <>
            {/* Dynamic QR Code */}
            <div className="my-3 text-center">
              <div className="p-3 bg-white border-2 border-orange-200 rounded-3xl shadow-inner inline-block">
                <img
                  src={qrImageSrc}
                  alt="UPI QR Code"
                  className="w-44 h-44 mx-auto rounded-2xl"
                />
              </div>

              <div className="mt-2 text-xs font-bold text-gray-700">
                UPI ID: <span className="text-orange-600 font-mono">{upiId}</span>
              </div>
              <div className="text-[11px] text-gray-400">({payeeName})</div>
            </div>

            {/* UPI Deep link Button */}
            <a
              href={upiUri}
              className="w-full mb-3 flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white text-xs font-black py-3 px-4 rounded-2xl shadow-md transition active:scale-95"
            >
              <Smartphone className="w-4 h-4" />
              <span>Open UPI App (GPay / PhonePe / Paytm)</span>
            </a>

            {/* Optional UTR */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-gray-600 mb-1">
                UPI Reference / UTR Number (Optional)
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. 423984729182"
                className="w-full px-4 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 focus:outline-hidden focus:border-orange-500"
              />
            </div>
          </>
        ) : (
          /* Cash Mode with Photo Proof */
          <div className="my-3 space-y-3">
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-[11px] text-emerald-800 leading-snug">
              💵 <strong>Cash Counter Payment:</strong> Masi ko direct cash handover karein. Proof ke liye cash note ya receipt ka photo snap karein.
            </div>

            {/* Camera / Photo Snapshot */}
            <div className="text-center py-2">
              {isCameraActive ? (
                <div className="relative w-48 h-48 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md mx-auto bg-black">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={takeCashProofPhoto}
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-emerald-600 text-white p-2.5 rounded-full shadow-lg hover:scale-110 active:scale-95 transition"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
              ) : cashProofImage ? (
                <div className="relative inline-block">
                  <img
                    src={cashProofImage}
                    alt="Cash Photo Proof"
                    className="w-36 h-36 rounded-2xl object-cover border-2 border-emerald-500 shadow-md mx-auto"
                  />
                  <button
                    type="button"
                    onClick={startCamera}
                    className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-1.5 rounded-full shadow-md hover:bg-emerald-700"
                    title="Retake Photo"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div
                    onClick={startCamera}
                    className="w-full py-6 rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50/50 hover:bg-emerald-100 flex flex-col items-center justify-center text-emerald-700 cursor-pointer transition group"
                  >
                    <Camera className="w-8 h-8 group-hover:scale-110 transition mb-1" />
                    <span className="text-xs font-black">Snap Cash Note / Handover Photo</span>
                    <span className="text-[10px] text-emerald-600 mt-0.5">(Proof will be sent directly to Masi)</span>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Camera</span>
                    </button>
                    <span className="text-gray-300">•</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload File</span>
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* Submit Claim Button */}
        <form onSubmit={handleSubmit}>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 px-6 rounded-2xl font-black text-white shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
              paymentMode === 'CASH'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 shadow-emerald-600/30'
                : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 shadow-orange-600/30'
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>
                  {paymentMode === 'CASH'
                    ? 'I AM PAYING CASH (SUBMIT PROOF)'
                    : 'I HAVE PAID (VERIFY VIA UPI)'}
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
