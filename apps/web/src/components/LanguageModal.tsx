'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../i18n/translations';
import { X, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguageModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { language, setLanguage, t } = useLanguage();

  if (!isOpen) return null;

  const languages: { code: Language; label: string; sub: string }[] = [
    { code: 'en', label: 'English', sub: 'English' },
    { code: 'hi', label: 'हिन्दी', sub: 'Hindi' },
    { code: 'gu', label: 'ગુજરાતી', sub: 'Gujarati' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-orange-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">{t('selectLanguage')}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {languages.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50/80 text-orange-950 font-bold shadow-sm'
                    : 'border-gray-200 hover:border-orange-200 bg-white text-gray-700'
                }`}
              >
                <div>
                  <div className="text-lg">{lang.label}</div>
                  <div className="text-xs text-gray-500">{lang.sub}</div>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
