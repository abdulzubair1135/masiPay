'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  menuItemId: string;
  name: string;
  nameHi?: string;
  nameGu?: string;
  price: number;
  quantity: number;
  image?: string;
  isVeg: boolean;
  specialInstruction?: string;
}

export interface TableContextData {
  tableId?: string;
  tableNumber?: string;
  secureToken?: string;
}

interface CartContextType {
  items: CartItem[];
  table: TableContextData | null;
  setTable: (table: TableContextData) => void;
  addItem: (item: any, quantity?: number) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateInstruction: (menuItemId: string, instruction: string) => void;
  clearCart: () => void;
  totalItemsCount: number;
  subtotal: number;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [table, setTableState] = useState<TableContextData | null>(null);

  useEffect(() => {
    const savedCart = localStorage.getItem('masi_cart');
    const savedTable = localStorage.getItem('masi_table');

    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (e) {}
    }
    if (savedTable) {
      try {
        setTableState(JSON.parse(savedTable));
      } catch (e) {}
    }
  }, []);

  const saveCartToStorage = (newItems: CartItem[]) => {
    setItems(newItems);
    localStorage.setItem('masi_cart', JSON.stringify(newItems));
  };

  const setTable = (t: TableContextData) => {
    setTableState(t);
    localStorage.setItem('masi_table', JSON.stringify(t));
  };

  const addItem = (item: any, quantity = 1) => {
    const existingIndex = items.findIndex((i) => i.menuItemId === item._id);
    let updated: CartItem[];

    if (existingIndex > -1) {
      updated = [...items];
      updated[existingIndex].quantity += quantity;
    } else {
      updated = [
        ...items,
        {
          menuItemId: item._id,
          name: item.name,
          nameHi: item.nameHi,
          nameGu: item.nameGu,
          price: item.price,
          quantity,
          image: item.image,
          isVeg: item.isVeg,
        },
      ];
    }
    saveCartToStorage(updated);
  };

  const updateQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(menuItemId);
      return;
    }
    const updated = items.map((i) =>
      i.menuItemId === menuItemId ? { ...i, quantity } : i
    );
    saveCartToStorage(updated);
  };

  const removeItem = (menuItemId: string) => {
    const updated = items.filter((i) => i.menuItemId !== menuItemId);
    saveCartToStorage(updated);
  };

  const updateInstruction = (menuItemId: string, specialInstruction: string) => {
    const updated = items.map((i) =>
      i.menuItemId === menuItemId ? { ...i, specialInstruction } : i
    );
    saveCartToStorage(updated);
  };

  const clearCart = () => {
    saveCartToStorage([]);
  };

  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal; // GST can be added here if needed

  return (
    <CartContext.Provider
      value={{
        items,
        table,
        setTable,
        addItem,
        removeItem,
        updateQuantity,
        updateInstruction,
        clearCart,
        totalItemsCount,
        subtotal,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
