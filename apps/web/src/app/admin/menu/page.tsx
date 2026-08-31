'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { Plus, Edit3, Trash2, UtensilsCrossed, CheckCircle, Ban, DollarSign } from 'lucide-react';

export default function AdminMenuPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New item modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [name, setName] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [nameGu, setNameGu] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(50);
  const [stock, setStock] = useState<string>('');
  const [categoryId, setCategoryId] = useState('');
  const [image, setImage] = useState('');
  const [isVeg, setIsVeg] = useState(true);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const [catsRes, itemsRes] = await Promise.all([
        api.get('/menu/categories'),
        api.get('/menu/items?all=true'),
      ]);
      setCategories(catsRes.data.data);
      setItems(itemsRes.data.data);
      if (catsRes.data.data.length > 0 && !categoryId) {
        setCategoryId(catsRes.data.data[0]._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setName(item.name);
      setNameHi(item.nameHi || '');
      setNameGu(item.nameGu || '');
      setDescription(item.description || '');
      setPrice(item.price);
      setStock(item.stock !== null && item.stock !== undefined ? String(item.stock) : '');
      setCategoryId(item.categoryId?._id || categories[0]?._id);
      setImage(item.image || '');
      setIsVeg(item.isVeg);
    } else {
      setEditingItem(null);
      setName('');
      setNameHi('');
      setNameGu('');
      setDescription('');
      setPrice(50);
      setStock('');
      setImage('');
      setIsVeg(true);
    }
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      nameHi: nameHi || undefined,
      nameGu: nameGu || undefined,
      description: description || undefined,
      price: Number(price),
      stock: stock === '' ? null : Number(stock),
      categoryId,
      image: image || undefined,
      isVeg,
      available: true,
      active: true,
    };

    try {
      if (editingItem) {
        await api.patch(`/admin/menu/${editingItem._id}`, payload);
      } else {
        await api.post('/admin/menu', payload);
      }
      setIsModalOpen(false);
      fetchMenu();
    } catch (err: any) {
      alert(err.message || 'Failed to save menu item');
    }
  };

  const handleToggleAvailability = async (item: any) => {
    try {
      await api.patch(`/staff/menu/${item._id}/availability`, {
        available: !item.available,
      });
      fetchMenu();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to deactivate this item?')) return;
    try {
      await api.delete(`/admin/menu/${itemId}`);
      fetchMenu();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      <header className="bg-gray-900 text-white px-4 py-3 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="text-xs font-bold text-gray-400 hover:text-white">
              ← Dashboard
            </Link>
            <h1 className="font-black text-lg">Menu & Stock Manager</h1>
          </div>

          <button
            onClick={() => handleOpenModal()}
            className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-3xl p-4 border border-gray-200 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex gap-3">
                    <img
                      src={
                        item.image ||
                        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'
                      }
                      alt={item.name}
                      className="w-20 h-20 rounded-2xl object-cover shrink-0"
                    />
                    <div>
                      <h3 className="font-extrabold text-sm text-gray-900">{item.name}</h3>
                      {item.nameHi && (
                        <div className="text-xs text-gray-500">{item.nameHi}</div>
                      )}
                      <div className="text-sm font-black text-purple-700 mt-1">
                        ₹{item.price}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Stock: {item.stock === null ? 'Unlimited' : `${item.stock} left`}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleAvailability(item)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      item.available
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    {item.available ? 'In Stock ✅' : 'Sold Out ❌'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenModal(item)}
                      className="p-2 text-gray-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item._id)}
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-extrabold text-gray-900 mb-4">
              {editingItem ? 'Edit Dish' : 'Add New Menu Item'}
            </h2>

            <form onSubmit={handleSaveItem} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Item Name (English) *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Crispy Veg Burger"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Name (Hindi)</label>
                  <input
                    type="text"
                    value={nameHi}
                    onChange={(e) => setNameHi(e.target.value)}
                    placeholder="क्रिस्पी बर्गर"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Name (Gujarati)</label>
                  <input
                    type="text"
                    value={nameGu}
                    onChange={(e) => setNameGu(e.target.value)}
                    placeholder="ક્રિસ્પી બર્ગર"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Stock (Blank = Unlimited)</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Category *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold"
                >
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-purple-700 text-white font-extrabold py-3 rounded-xl"
                >
                  Save Item
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
