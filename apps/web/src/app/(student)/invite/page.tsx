'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import QRCode from 'qrcode';
import {
  Share2,
  Copy,
  Check,
  QrCode,
  Sparkles,
  Download,
  Users,
  MessageCircle,
  UtensilsCrossed,
} from 'lucide-react';

export default function InvitePage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [canteenUrl, setCanteenUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://masicanteen.vercel.app';
    const inviteLink = `${origin}/menu`;
    setCanteenUrl(inviteLink);

    QRCode.toDataURL(inviteLink, {
      width: 320,
      margin: 2,
      color: {
        dark: '#ea580c',
        light: '#ffffff',
      },
    }).then(setQrDataUrl);
  }, []);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(canteenUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🍔 Hey! Aaj canteen chalte hain? MasiCanteen se seedha live order karo aur bina line mein khade hue khana lo!\n👉 Order Link: ${canteenUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'MasiCanteen_QR_Poster.png';
    a.click();
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-20">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white mx-auto shadow-xl shadow-orange-500/20 mb-3">
          <Share2 className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          {language === 'hi' ? 'दोस्तों को इनवाइट करें' : language === 'gu' ? 'મિત્રોને આમંત્રિત કરો' : 'Invite Friends & Share'}
        </h1>
        <p className="text-xs text-gray-500 font-medium mt-1">
          {language === 'hi'
            ? 'कैंटीन का QR शेयर करें और दोस्तों के साथ बिना लाइन में लगे खाना ऑर्डर करें'
            : language === 'gu'
            ? 'કેન્ટીનનું QR શેર કરો અને લાઈનમાં ઊભા રહ્યા વિના ઓર્ડર કરો'
            : 'Share Canteen QR with classmates to skip the queue & order directly'}
        </p>
      </div>

      {/* Digital Canteen QR Poster */}
      <div className="bg-white rounded-3xl p-6 border-2 border-orange-200 shadow-xl mb-4 text-center relative overflow-hidden">
        <div className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-800 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2">
          <UtensilsCrossed className="w-3.5 h-3.5" />
          <span>MasiCanteen Official QR</span>
        </div>

        <h2 className="text-lg font-black text-gray-900">
          “Order karo, Masi tak turant pahunchao”
        </h2>

        {/* QR Code */}
        {qrDataUrl && (
          <div className="my-4 flex justify-center">
            <div className="p-3 bg-white border-2 border-orange-400 rounded-3xl shadow-inner inline-block">
              <img
                src={qrDataUrl}
                alt="MasiCanteen QR Code"
                className="w-56 h-56 mx-auto rounded-2xl"
              />
            </div>
          </div>
        )}

        <p className="text-[11px] font-bold text-gray-500">
          Scan to open Menu • Fast UPI Pay • Live Pickup Token
        </p>

        <button
          onClick={handleDownloadQR}
          className="mt-4 inline-flex items-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-700 font-extrabold px-4 py-2 rounded-2xl text-xs transition border border-orange-200"
        >
          <Download className="w-4 h-4" />
          <span>{language === 'hi' ? 'QR पोस्टर डाउनलोड करें' : 'Download Printable QR'}</span>
        </button>
      </div>

      {/* Share Actions */}
      <div className="space-y-3 mb-6">
        {/* WhatsApp Share Button */}
        <button
          onClick={handleWhatsAppShare}
          className="w-full flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]"
        >
          <MessageCircle className="w-5 h-5" />
          <span>{language === 'hi' ? 'WhatsApp पर शेयर करें' : 'Share on WhatsApp'}</span>
        </button>

        {/* Copy Link Input */}
        <div className="bg-white rounded-2xl p-2 pl-4 border border-gray-200 flex items-center justify-between gap-2 shadow-xs">
          <span className="text-xs font-bold text-gray-600 truncate">{canteenUrl}</span>
          <button
            onClick={handleCopy}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition ${
              copied ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-900 text-white hover:bg-black'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
