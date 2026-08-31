'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import { useLanguage } from '../../../context/LanguageContext';
import { Heart, Plus, Minus, UtensilsCrossed } from 'lucide-react';

export default function FavoritesPage() {
  const { user } = useAuth();
  const { items: cartItems, addItem, updateQuantity } = useCart();
  const { t } = useLanguage();

  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/user/favorites');
      setFavorites(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [user]);

  const toggleFavorite = async (itemId: string) => {
    try {
      await api.post('/user/favorites/toggle', { menuItemId: itemId });
      setFavorites((prev) => prev.filter((f) => f.menuItemId._id !== itemId));
    } catch (err) {
      console.error(err);
    }
  };

  const getItemQuantityInCart = (itemId: string) => {
    const item = cartItems.find((ci) => ci.menuItemId === itemId);
    return item ? item.quantity : 0;
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <Heart className="w-16 h-16 text-gray-300 mx-auto mb-3" />
        <h2 className="text-xl font-extrabold text-gray-900">Please Login</h2>
        <p className="text-xs text-gray-500 mb-6">Login to save your favorite canteen snacks.</p>
        <Link
          href="/login"
          className="bg-orange-600 text-white font-bold px-6 py-3 rounded-2xl shadow-md inline-block"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-12">
      <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-4">
        {t('favorites')}
      </h1>

      {loading ? (
        <div className="py-12 text-center">
          <div className="w-8 h-8 border-3 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-gray-500 mt-2">Loading favorites...</p>
        </div>
      ) : favorites.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-gray-200">
          <Heart className="w-12 h-12 text-rose-200 mx-auto mb-3" />
          <h3 className="font-extrabold text-gray-800">No favorite dishes yet</h3>
          <p className="text-xs text-gray-500 mt-1">Tap the heart icon on any menu item to save it here!</p>
          <Link
            href="/menu"
            className="mt-4 inline-block bg-orange-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs"
          >
            Explore Menu
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {favorites.map((fav) => {
            const item = fav.menuItemId;
            if (!item) return null;
            const qty = getItemQuantityInCart(item._id);

            return (
              <div
                key={fav._id}
                className="bg-white rounded-3xl p-4 border border-orange-100 shadow-sm flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={
                      item.image ||
                      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'
                    }
                    alt={item.name}
                    className="w-16 h-16 rounded-2xl object-cover"
                  />
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-900">{item.name}</h3>
                    <div className="font-extrabold text-xs text-orange-600 mt-0.5">
                      ₹{item.price}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFavorite(item._id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-full transition"
                  >
                    <Heart className="w-4 h-4 fill-rose-500" />
                  </button>

                  {qty > 0 ? (
                    <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-xl px-2 py-1">
                      <button
                        onClick={() => updateQuantity(item._id, qty - 1)}
                        className="w-6 h-6 rounded-lg bg-white text-orange-600 flex items-center justify-center font-bold"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-extrabold text-xs text-orange-950 w-4 text-center">
                        {qty}
                      </span>
                      <button
                        onClick={() => updateQuantity(item._id, qty + 1)}
                        className="w-6 h-6 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addItem(item)}
                      className="bg-orange-600 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-xs hover:bg-orange-700 transition"
                    >
                      {t('add')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
