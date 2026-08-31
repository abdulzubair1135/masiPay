'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageModal } from './LanguageModal';
import { Globe, MapPin, ShoppingBag, UtensilsCrossed, User as UserIcon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user } = useAuth();
  const { table, totalItemsCount } = useCart();
  const { t, language } = useLanguage();
  const [langModalOpen, setLangModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-orange-100 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo & Tagline */}
          <Link href="/menu" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent leading-none">
                {t('appName')}
              </div>
              <div className="text-[10px] text-gray-500 font-medium hidden sm:block">
                {t('tagline')}
              </div>
            </div>
          </Link>

          {/* Table Badge, Language Switcher & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Table Badge */}
            {table?.tableNumber && (
              <div className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full border border-orange-200 text-xs font-bold shadow-2xs">
                <MapPin className="w-3.5 h-3.5 text-orange-600" />
                <span>{t('table')} {table.tableNumber}</span>
              </div>
            )}

            {/* Language Selector Button */}
            <button
              onClick={() => setLangModalOpen(true)}
              className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-full text-xs font-semibold transition"
              title="Change Language"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="uppercase">{language}</span>
            </button>

            {/* Cart Icon in Navbar */}
            <Link
              href="/checkout"
              className="relative p-2 text-gray-700 hover:text-orange-600 rounded-full hover:bg-orange-50 transition"
              title={t('cart')}
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                  {totalItemsCount}
                </span>
              )}
            </Link>

            {/* Profile / Avatar */}
            <Link
              href={user ? '/profile' : '/login'}
              className="flex items-center gap-2 p-1.5 rounded-full hover:bg-orange-50 transition"
            >
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border border-orange-300 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </Link>
          </div>
        </div>
      </header>

      <LanguageModal isOpen={langModalOpen} onClose={() => setLangModalOpen(false)} />
    </>
  );
};
