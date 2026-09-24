'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { playFoodReadySiren } from '../../lib/sound';
import {
  ChefHat,
  BellRing,
  Clock,
  Sparkles,
  MapPin,
  Flame,
  Volume2,
  VolumeX,
} from 'lucide-react';

export default function PublicCanteenTvDisplay() {
  const [orders, setOrders] = useState<any[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [time, setTime] = useState('');

  const fetchDisplayOrders = async () => {
    try {
      const res = await api.get('/orders/my'); // public active orders
    } catch (e) {
      // fallback
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('join:room', 'staff-room');

    socket.on('order:created', (newOrder: any) => {
      setOrders((prev) => [newOrder, ...prev]);
    });

    socket.on('order:status_changed', (payload: any) => {
      if (payload.status === 'READY') {
        if (soundEnabled) playFoodReadySiren();
      }
      setOrders((prev) => {
        if (payload.status === 'DELIVERED' || payload.status === 'CANCELLED') {
          return prev.filter((o) => o._id !== payload.orderId);
        }
        return prev.map((o) =>
          o._id === payload.orderId
            ? { ...o, status: payload.status, pickupCounter: payload.pickupCounter || o.pickupCounter }
            : o
        );
      });
    });

    return () => {
      socket.off('order:created');
      socket.off('order:status_changed');
    };
  }, [soundEnabled]);

  const readyOrders = orders.filter((o) => o.status === 'READY');
  const cookingOrders = orders.filter((o) => ['ACCEPTED', 'PREPARING', 'PAYMENT_VERIFYING'].includes(o.status));

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 flex flex-col font-sans select-none">
      {/* Top TV Header */}
      <header className="flex items-center justify-between pb-4 border-b border-gray-800 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-orange-600/30">
            <ChefHat className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>SRK CANTEEN LIVE CALLING BOARD</span>
              <span className="bg-emerald-500 text-black text-xs font-black px-2.5 py-1 rounded-full uppercase animate-pulse">
                LIVE
              </span>
            </h1>
            <p className="text-sm font-bold text-gray-400">
              Pick up your hot food from the assigned counter when your Token is called
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-3 rounded-2xl border transition ${
              soundEnabled
                ? 'bg-orange-600 text-white border-orange-500 shadow-lg'
                : 'bg-gray-900 text-gray-400 border-gray-800'
            }`}
            title="Toggle Siren Sound"
          >
            {soundEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>

          <div className="text-right">
            <div className="text-xs font-black text-gray-400 uppercase tracking-widest">
              CURRENT TIME
            </div>
            <div className="text-2xl font-black text-amber-400 tracking-wider font-mono">
              {time}
            </div>
          </div>
        </div>
      </header>

      {/* Main Split Columns: READY vs PREPARING */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        {/* Column 1: 🟢 READY FOR PICKUP */}
        <div className="bg-emerald-950/40 rounded-3xl p-6 border-2 border-emerald-500/50 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-emerald-800/50 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-black flex items-center justify-center font-black animate-bounce">
                <BellRing className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-emerald-400 tracking-tight">
                  READY FOR PICKUP / तैयार है
                </h2>
                <div className="text-xs font-bold text-emerald-200/70">
                  Proceed to the assigned counter with your token
                </div>
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-400 bg-emerald-900/50 px-4 py-1.5 rounded-2xl border border-emerald-700/50">
              {readyOrders.length}
            </div>
          </div>

          {readyOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
              <Sparkles className="w-12 h-12 text-gray-700 mb-2" />
              <div className="text-base font-bold">No orders waiting for pickup right now</div>
              <div className="text-xs text-gray-600">Fresh hot food is being prepared!</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 auto-rows-max overflow-y-auto">
              {readyOrders.map((ord) => (
                <div
                  key={ord._id}
                  className="bg-emerald-500 text-black p-5 rounded-3xl shadow-xl flex flex-col justify-between transform transition duration-300 animate-in zoom-in-95"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider bg-black/15 px-2.5 py-0.5 rounded-full">
                      TOKEN
                    </span>
                    <span className="text-xs font-black truncate max-w-[100px]">
                      {ord.userId?.name || 'Student'}
                    </span>
                  </div>

                  <div className="text-4xl font-black tracking-tight text-center my-1">
                    #{ord.orderNumber}
                  </div>

                  <div className="mt-2 pt-2 border-t border-black/20 flex items-center justify-center gap-1.5 bg-black/90 text-white py-2 px-3 rounded-2xl">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black tracking-wide">
                      {ord.pickupCounter || 'Counter A'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: 🟡 NOW COOKING IN KITCHEN */}
        <div className="bg-gray-900/60 rounded-3xl p-6 border-2 border-gray-800 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-black flex items-center justify-center font-black">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-amber-400 tracking-tight">
                  NOW COOKING / बन रहा है
                </h2>
                <div className="text-xs font-bold text-gray-400">
                  Masi is actively preparing these orders
                </div>
              </div>
            </div>
            <div className="text-3xl font-black text-amber-400 bg-gray-800 px-4 py-1.5 rounded-2xl border border-gray-700">
              {cookingOrders.length}
            </div>
          </div>

          {cookingOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-600">
              <Clock className="w-12 h-12 text-gray-800 mb-2" />
              <div className="text-base font-bold">Kitchen Queue is Empty</div>
              <div className="text-xs text-gray-600">Waiting for next recess rush</div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 auto-rows-max overflow-y-auto">
              {cookingOrders.map((ord) => (
                <div
                  key={ord._id}
                  className="bg-gray-800/80 border border-gray-700 p-4 rounded-3xl text-center shadow-md flex flex-col justify-between"
                >
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">
                    TOKEN
                  </div>
                  <div className="text-3xl font-black text-amber-400">
                    #{ord.orderNumber}
                  </div>
                  <div className="text-[11px] font-bold text-gray-400 mt-2 truncate">
                    {ord.items?.map((i: any) => i.itemName).join(', ') || 'Cooking'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* TV Footer */}
      <footer className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500 font-bold">
        <div>
          💡 Order on your phone at: <strong className="text-white font-extrabold">masicanteen.vercel.app</strong>
        </div>
        <div>
          ⚡ SRK Smart Canteen Realtime Display
        </div>
      </footer>
    </div>
  );
}
