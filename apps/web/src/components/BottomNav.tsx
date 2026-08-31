'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { UtensilsCrossed, Clock, Heart, User } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const { totalItemsCount, total } = useCart();

  // Hide bottom nav on staff and admin routes
  if (pathname?.startsWith('/staff') || pathname?.startsWith('/admin')) {
    return null;
  }

  const links = [
    { href: '/menu', label: language === 'hi' ? 'मेनू' : 'Menu', icon: UtensilsCrossed },
    { href: '/orders', label: t('myOrders'), icon: Clock },
    { href: '/invite', label: language === 'hi' ? 'शेयर' : 'Invite', icon: Heart },
    { href: '/profile', label: t('profile'), icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {/* Floating Cart Bar if Cart has items and not on checkout page */}
      {totalItemsCount > 0 && pathname !== '/checkout' && (
        <div className="max-w-md mx-auto px-4 pb-2">
          <Link
            href="/checkout"
            className="flex items-center justify-between bg-gradient-to-r from-orange-600 to-amber-600 text-white px-5 py-3.5 rounded-2xl shadow-xl shadow-orange-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="bg-white/20 px-2.5 py-1 rounded-full text-xs font-bold">
                {totalItemsCount} {t('items')}
              </span>
              <span className="font-bold text-sm">{t('viewCart')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base">₹{total}</span>
              <span className="text-xs bg-white text-orange-700 px-2.5 py-1 rounded-full font-bold">
                →
              </span>
            </div>
          </Link>
        </div>
      )}

      {/* Bottom Tab Bar */}
      <nav className="bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-4 py-2 px-2">
          {links.map((item) => {
            const isActive = pathname === item.href || (item.href === '/menu' && pathname === '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                  isActive
                    ? 'text-orange-600 font-bold'
                    : 'text-gray-500 hover:text-gray-900 font-medium'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className="text-[11px] mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
