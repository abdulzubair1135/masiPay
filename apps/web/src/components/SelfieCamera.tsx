'use client';

import React, { useRef, useState } from 'react';
import { Camera, RefreshCw, Upload, Check } from 'lucide-react';

interface Props {
  onCapture: (imageDataBase64: string) => void;
  initialImage?: string;
}

export const SelfieCamera: React.FC<Props> = ({ onCapture, initialImage }) => {
  const [photo, setPhoto] = useState<string | null>(initialImage || null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 400, height: 400 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera access error, fallback to file upload:', err);
      setIsCameraActive(false);
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const takeSelfie = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror image for natural selfie feel
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhoto(dataUrl);
      onCapture(dataUrl);
    }
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPhoto(result);
        onCapture(result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      {isCameraActive ? (
        <div className="relative w-44 h-44 rounded-full overflow-hidden border-4 border-orange-500 shadow-lg bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
          <button
            type="button"
            onClick={takeSelfie}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-orange-600 text-white p-2.5 rounded-full shadow-lg hover:scale-110 active:scale-95 transition"
            title="Snap Selfie"
          >
            <Camera className="w-6 h-6" />
          </button>
        </div>
      ) : photo ? (
        <div className="relative group">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-orange-500 shadow-md">
            <img src={photo} alt="Student Selfie" className="w-full h-full object-cover" />
          </div>
          <button
            type="button"
            onClick={startCamera}
            className="absolute -bottom-1 -right-1 bg-orange-600 text-white p-2 rounded-full shadow-md hover:bg-orange-700 transition"
            title="Retake Selfie"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div
            onClick={startCamera}
            className="w-28 h-28 rounded-full border-2 border-dashed border-orange-400 bg-orange-50/50 hover:bg-orange-100 flex flex-col items-center justify-center text-orange-600 cursor-pointer transition shadow-2xs group"
          >
            <Camera className="w-8 h-8 group-hover:scale-110 transition" />
            <span className="text-[11px] font-extrabold mt-1">Take Selfie</span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={startCamera}
              className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1"
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
              <span>Upload</span>
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};
