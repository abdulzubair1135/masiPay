'use client';

import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  X,
  CheckCircle2,
  Printer,
  QrCode,
  Sparkles,
  MapPin,
  RefreshCw,
} from 'lucide-react';

interface CounterQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: number;
  orderId: string;
  assignedCounter?: string;
  onCounterSelected: (counterName: string) => void;
}

const COUNTER_LIST = [
  'Counter A',
  'Counter B',
  'Counter C',
  'Counter D',
  'Counter E',
  'Counter 1',
  'Counter 2',
  'Counter 3',
  'Counter 4',
  'Counter 5',
];

export const CounterQrScannerModal: React.FC<CounterQrScannerModalProps> = ({
  isOpen,
  onClose,
  orderNumber,
  orderId,
  assignedCounter = 'Counter A',
  onCounterSelected,
}) => {
  const [activeView, setActiveView] = useState<'SCANNER' | 'PRINT'>('SCANNER');
  const [counterQrs, setCounterQrs] = useState<{ name: string; dataUrl: string }[]>([]);
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Generate Printable QRs for all Counters
  useEffect(() => {
    async function genQrs() {
      const generated = await Promise.all(
        COUNTER_LIST.map(async (name) => {
          const payload = JSON.stringify({ type: 'MASI_COUNTER', counter: name });
          const url = await QRCode.toDataURL(payload, {
            width: 220,
            margin: 1.5,
            color: { dark: '#0284c7', light: '#ffffff' },
          });
          return { name, dataUrl: url };
        })
      );
      setCounterQrs(generated);
    }
    genQrs();
  }, []);

  // Initialize Html5Qrcode Camera Scanner
  useEffect(() => {
    if (!isOpen || activeView !== 'SCANNER') {
      stopScanner();
      return;
    }

    let isMounted = true;
    const scannerId = 'counter-qr-reader';

    const startScanner = async () => {
      try {
        setCameraError(null);
        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            if (!isMounted) return;
            // Parse Scanned Text
            let matchedCounter = '';
            try {
              const parsed = JSON.parse(decodedText);
              if (parsed.counter) matchedCounter = parsed.counter;
            } catch (e) {
              // Direct string match e.g. "Counter A" or "COUNTER_A"
              const clean = decodedText.trim();
              const found = COUNTER_LIST.find(
                (c) => c.toLowerCase() === clean.toLowerCase() || clean.toLowerCase().includes(c.toLowerCase())
              );
              if (found) matchedCounter = found;
              else matchedCounter = clean;
            }

            if (matchedCounter) {
              stopScanner();
              onCounterSelected(matchedCounter);
            }
          },
          () => {}
        );
        if (isMounted) setScannerActive(true);
      } catch (err: any) {
        if (isMounted) {
          setCameraError('Camera access unavailable. Please choose Counter from below.');
          setScannerActive(false);
        }
      }
    };

    // Small delay to ensure DOM element exists
    const timer = setTimeout(() => {
      startScanner();
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen, activeView]);

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
      setScannerActive(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl border-2 border-sky-300 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-black">
              📍
            </div>
            <div>
              <h3 className="font-black text-base text-gray-900 leading-snug">
                Counter QR Scan & Alert
              </h3>
              <div className="text-[11px] font-bold text-orange-600">
                TOKEN #{orderNumber}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-2xl mb-4 text-xs font-black">
          <button
            onClick={() => setActiveView('SCANNER')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeView === 'SCANNER' ? 'bg-white text-sky-700 shadow-xs' : 'text-gray-500'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Scan Counter QR</span>
          </button>

          <button
            onClick={() => setActiveView('PRINT')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeView === 'PRINT' ? 'bg-white text-purple-700 shadow-xs' : 'text-gray-500'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print Counter Stickers</span>
          </button>
        </div>

        {activeView === 'SCANNER' ? (
          <div>
            {/* App Assigned Target Counter Banner */}
            <div className="mb-3.5 p-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl shadow-sm text-center">
              <div className="text-[10px] uppercase font-extrabold tracking-wider text-amber-100">
                🎯 App ne Counter Chun Liya Hai
              </div>
              <div className="text-xl font-black">
                📍 {assignedCounter}
              </div>
              <div className="text-[11px] text-white/90 font-semibold mt-0.5">
                Yeh order {assignedCounter} par rakhna hai!
              </div>
            </div>

            {/* Quick 1-Click Confirm Button */}
            <button
              onClick={() => {
                stopScanner();
                onCounterSelected(assignedCounter);
              }}
              className="w-full py-3.5 mb-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>⚡ Confirm Placed on {assignedCounter}</span>
            </button>

            <div className="text-center text-[11px] text-gray-400 font-bold mb-2">
              — YA CAMERA SE COUNTER QR SCAN KAREIN —
            </div>

            {/* Live Camera Box */}
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-[220px] mx-auto border-2 border-sky-400 shadow-inner mb-3 flex items-center justify-center">
              <div id="counter-qr-reader" className="w-full h-full" />
              {cameraError && (
                <div className="absolute inset-0 bg-gray-900/90 text-white p-4 flex flex-col items-center justify-center text-center text-xs">
                  <Camera className="w-8 h-8 text-rose-400 mb-2" />
                  <p className="font-bold text-rose-300">{cameraError}</p>
                </div>
              )}
            </div>

            <p className="text-center text-xs font-extrabold text-gray-700 mb-3">
              📸 Counter par lage QR Sticker ko scan karein ya neeche 1-Tap karein:
            </p>

            {/* Quick 1-Tap Chips */}
            <div className="grid grid-cols-2 gap-2">
              {COUNTER_LIST.map((counterName) => (
                <button
                  key={counterName}
                  onClick={() => {
                    stopScanner();
                    onCounterSelected(counterName);
                  }}
                  className="py-3 px-2 rounded-2xl border-2 border-sky-200 bg-sky-50/60 hover:bg-sky-600 hover:text-white font-black text-xs transition active:scale-95 text-sky-900 flex items-center justify-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{counterName}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Printable Counter Posters Sheet */
          <div className="space-y-4 text-center">
            <p className="text-xs text-gray-500 font-medium">
              In QRs ka printout nikal kar apne Canteen Counters (A, B, C, D...) par chipka dein:
            </p>

            <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto p-1">
              {counterQrs.map((item) => (
                <div
                  key={item.name}
                  className="bg-sky-50/70 p-3 rounded-2xl border-2 border-sky-300 text-center"
                >
                  <div className="text-xs font-black text-sky-900 mb-1">
                    📍 {item.name}
                  </div>
                  <img
                    src={item.dataUrl}
                    alt={item.name}
                    className="w-28 h-28 mx-auto rounded-xl bg-white p-1 border shadow-xs"
                  />
                  <div className="text-[10px] font-bold text-gray-500 mt-1">
                    Pickup Counter Sticker
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-black text-xs rounded-2xl shadow-lg transition flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print All Counter Stickers</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
