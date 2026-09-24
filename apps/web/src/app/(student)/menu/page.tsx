'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useCart } from '../../../context/CartContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import { getSocket } from '../../../lib/socket';
import {
  Search,
  Plus,
  Minus,
  Heart,
  Sparkles,
  MapPin,
  Check,
  AlertCircle,
  UtensilsCrossed,
  Flame,
  Zap,
  Tag,
} from 'lucide-react';

export default function StudentMenuPage() {
  const { table, items: cartItems, addItem, updateQuantity } = useCart();
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [vegFilter, setVegFilter] = useState<boolean | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);

  // Load menu and categories
  const fetchData = async () => {
    try {
      setLoading(true);
      const [catsRes, itemsRes] = await Promise.all([
        api.get('/menu/categories'),
        api.get('/menu/items?all=true'),
      ]);
      setCategories(catsRes.data.data);
      setMenuItems(itemsRes.data.data);

      if (user) {
        try {
          const favsRes = await api.get('/user/favorites');
          const favSet = new Set<string>(
            favsRes.data.data.map((f: any) => f.menuItemId._id || f.menuItemId)
          );
          setFavorites(favSet);
        } catch (e) {}
      }
    } catch (err) {
      console.error('Failed to load menu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen to real-time menu availability updates from Masi
    const socket = getSocket();
    socket.on('menu:availability_changed', (payload: any) => {
      setMenuItems((prev) =>
        prev.map((item) =>
          item._id === payload.menuItemId
            ? { ...item, available: payload.available, stock: payload.stock }
            : item
        )
      );
    });

    return () => {
      socket.off('menu:availability_changed');
    };
  }, [user]);

  const toggleFavorite = async (itemId: string) => {
    if (!user) return;
    try {
      const res = await api.post('/user/favorites/toggle', { menuItemId: itemId });
      const newFavs = new Set(favorites);
      if (res.data.data.favorited) {
        newFavs.add(itemId);
      } else {
        newFavs.delete(itemId);
      }
      setFavorites(newFavs);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter items
  const filteredItems = menuItems.filter((item) => {
    if (selectedCategory !== 'ALL' && item.categoryId?._id !== selectedCategory) {
      return false;
    }
    if (vegFilter !== null && item.isVeg !== vegFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchEn = item.name?.toLowerCase().includes(q);
      const matchHi = item.nameHi?.toLowerCase().includes(q);
      const matchGu = item.nameGu?.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      if (!matchEn && !matchHi && !matchGu && !matchDesc) return false;
    }
    return true;
  });

  const getItemQuantityInCart = (itemId: string) => {
    const item = cartItems.find((ci) => ci.menuItemId === itemId);
    return item ? item.quantity : 0;
  };

  const getLocalizedName = (item: any) => {
    if (language === 'hi' && item.nameHi) return item.nameHi;
    if (language === 'gu' && item.nameGu) return item.nameGu;
    return item.name;
  };

  const getLocalizedDesc = (item: any) => {
    if (language === 'hi' && item.descriptionHi) return item.descriptionHi;
    if (language === 'gu' && item.descriptionGu) return item.descriptionGu;
    return item.description;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Greeting & Table status */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
            {t('goodMorning')}, {user?.name ? user.name.split(' ')[0] : 'Foodie'} 👋
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            {table ? `${t('table')} ${table.tableNumber}` : 'Ordering for Canteen Dine-in / Takeaway'}
          </p>
        </div>

        {table?.tableNumber ? (
          <div className="flex items-center gap-1.5 bg-orange-100 text-orange-800 px-3.5 py-1.5 rounded-full text-xs font-extrabold border border-orange-200 shadow-2xs">
            <MapPin className="w-3.5 h-3.5" />
            <span>T-{table.tableNumber}</span>
          </div>
        ) : (
          <button
            onClick={() => {
              const num = prompt('Enter Table Number (or scan QR):', '01');
              if (num) {
                // Find table
              }
            }}
            className="text-xs bg-gray-100 hover:bg-orange-50 text-gray-700 hover:text-orange-700 px-3 py-1.5 rounded-full font-bold border transition"
          >
            + Set Table
          </button>
        )}
      </div>

      {/* Search & Veg Toggle */}
      <div className="space-y-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchMenu')}
            className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm shadow-2xs transition"
          />
        </div>

        {/* 🔥 SRK Daily Combos & Special Offers Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-gray-900 uppercase tracking-wider">
              <Flame className="w-4 h-4 text-orange-600 animate-pulse" />
              <span>🔥 SRK Daily Combos & Offers</span>
            </div>
            <span className="text-[10px] bg-red-100 text-red-700 font-extrabold px-2 py-0.5 rounded-full">
              SAVE UP TO ₹20
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {/* Combo 1 */}
            <div className="min-w-[240px] max-w-[260px] bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 rounded-3xl p-3.5 text-white shadow-lg shadow-orange-500/20 flex flex-col justify-between shrink-0">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="bg-white/20 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                    ⚡ Most Loved
                  </span>
                  <span className="text-[11px] font-black bg-white text-orange-600 px-2 py-0.5 rounded-full">
                    SAVE ₹10
                  </span>
                </div>
                <h3 className="font-black text-sm tracking-tight">SRK Dhamaka Combo</h3>
                <p className="text-[11px] text-orange-100 mt-0.5">2× Samosa + 1× Hot Masala Chai</p>
              </div>
              <div className="mt-3 pt-2 border-t border-white/20 flex items-center justify-between">
                <div>
                  <span className="text-base font-black">₹30</span>
                  <span className="text-[10px] text-orange-200 line-through ml-1.5">₹40</span>
                </div>
                <button
                  onClick={() => {
                    addItem({
                      _id: 'srk-combo-1',
                      name: 'SRK Dhamaka Combo (2 Samosa + Chai)',
                      price: 30,
                      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200',
                    });
                  }}
                  className="bg-white text-orange-600 hover:bg-orange-50 font-black text-xs px-3 py-1.5 rounded-xl shadow-md transition active:scale-95 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ADD</span>
                </button>
              </div>
            </div>

            {/* Combo 2 */}
            <div className="min-w-[240px] max-w-[260px] bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-600 rounded-3xl p-3.5 text-white shadow-lg shadow-orange-600/20 flex flex-col justify-between shrink-0">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="bg-white/20 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                    ⭐ Today's Special
                  </span>
                  <span className="text-[11px] font-black bg-white text-amber-700 px-2 py-0.5 rounded-full">
                    SAVE ₹15
                  </span>
                </div>
                <h3 className="font-black text-sm tracking-tight">Mumbai Pav Bhaji Feast</h3>
                <p className="text-[11px] text-amber-100 mt-0.5">Butter Pav Bhaji + Extra Pav + Nimbu</p>
              </div>
              <div className="mt-3 pt-2 border-t border-white/20 flex items-center justify-between">
                <div>
                  <span className="text-base font-black">₹60</span>
                  <span className="text-[10px] text-amber-200 line-through ml-1.5">₹75</span>
                </div>
                <button
                  onClick={() => {
                    addItem({
                      _id: 'srk-combo-2',
                      name: "Today's Special Pav Bhaji Feast",
                      price: 60,
                      image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=200',
                    });
                  }}
                  className="bg-white text-amber-700 hover:bg-amber-50 font-black text-xs px-3 py-1.5 rounded-xl shadow-md transition active:scale-95 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ADD</span>
                </button>
              </div>
            </div>

            {/* Combo 3 */}
            <div className="min-w-[240px] max-w-[260px] bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 rounded-3xl p-3.5 text-white shadow-lg shadow-teal-600/20 flex flex-col justify-between shrink-0">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="bg-white/20 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                    🍱 Student Lunch Box
                  </span>
                  <span className="text-[11px] font-black bg-white text-emerald-800 px-2 py-0.5 rounded-full">
                    SAVE ₹20
                  </span>
                </div>
                <h3 className="font-black text-sm tracking-tight">Full Thali Power Meal</h3>
                <p className="text-[11px] text-emerald-100 mt-0.5">Dal Tadka + Jeera Rice + 2 Roti + Sabzi</p>
              </div>
              <div className="mt-3 pt-2 border-t border-white/20 flex items-center justify-between">
                <div>
                  <span className="text-base font-black">₹70</span>
                  <span className="text-[10px] text-emerald-200 line-through ml-1.5">₹90</span>
                </div>
                <button
                  onClick={() => {
                    addItem({
                      _id: 'srk-combo-3',
                      name: 'Full Thali Power Meal (Dal Rice + Roti)',
                      price: 70,
                      image: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=200',
                    });
                  }}
                  className="bg-white text-emerald-700 hover:bg-emerald-50 font-black text-xs px-3 py-1.5 rounded-xl shadow-md transition active:scale-95 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ADD</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
            }`}
          >
            {t('all')}
          </button>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat._id;
            const catName =
              language === 'hi' && cat.nameHi
                ? cat.nameHi
                : language === 'gu' && cat.nameGu
                ? cat.nameGu
                : cat.name;
            return (
              <button
                key={cat._id}
                onClick={() => setSelectedCategory(cat._id)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
                }`}
              >
                {catName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Food Items List */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-gray-500 mt-2">Loading fresh menu...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-gray-200">
          <UtensilsCrossed className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <h3 className="font-bold text-gray-700">No items found</h3>
          <p className="text-xs text-gray-500 mt-1">Try selecting another category or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredItems.map((item) => {
            const qty = getItemQuantityInCart(item._id);
            const isFavorited = favorites.has(item._id);
            const isAvailable = item.available && (item.stock === null || item.stock > 0);

            return (
              <div
                key={item._id}
                className={`bg-white rounded-3xl p-3.5 border transition-all flex flex-col justify-between ${
                  isAvailable
                    ? 'border-gray-100 hover:border-orange-200 hover:shadow-md'
                    : 'border-gray-200 opacity-65 bg-gray-50'
                }`}
              >
                <div className="flex gap-3">
                  {/* Food Image */}
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 bg-gray-100">
                    <img
                      src={
                        item.image ||
                        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'
                      }
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Veg Badge */}
                    <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-xs p-1 rounded-md shadow-2xs">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}
                      />
                    </div>

                    {/* Favorite Button */}
                    <button
                      onClick={() => toggleFavorite(item._id)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-white/90 text-gray-400 hover:text-rose-500 shadow-2xs transition"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isFavorited ? 'fill-rose-500 text-rose-500' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Title, description & price */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-sm text-gray-900 line-clamp-1 leading-snug">
                        {getLocalizedName(item)}
                      </h3>
                      <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5 leading-tight">
                        {getLocalizedDesc(item)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="font-extrabold text-base text-gray-900">
                        ₹{item.price}
                      </span>
                      {item.stock !== null && item.stock <= 5 && isAvailable && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                          {item.stock} left
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add / Quantity Button */}
                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-end">
                  {!isAvailable ? (
                    <span className="text-xs font-bold text-gray-400 bg-gray-200 px-3 py-1.5 rounded-xl w-full text-center">
                      {t('soldOut')}
                    </span>
                  ) : qty > 0 ? (
                    <div className="flex items-center justify-between w-full bg-orange-50 border border-orange-200 rounded-xl px-2 py-1">
                      <button
                        onClick={() => updateQuantity(item._id, qty - 1)}
                        className="w-7 h-7 rounded-lg bg-white text-orange-600 hover:bg-orange-100 flex items-center justify-center font-extrabold shadow-2xs transition"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-extrabold text-sm text-orange-950">{qty}</span>
                      <button
                        onClick={() => updateQuantity(item._id, qty + 1)}
                        className="w-7 h-7 rounded-lg bg-orange-600 text-white hover:bg-orange-700 flex items-center justify-center font-extrabold shadow-2xs transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addItem(item)}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs py-2 px-4 rounded-xl shadow-xs transition-transform active:scale-[0.98] flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('add')}</span>
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
