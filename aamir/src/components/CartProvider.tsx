"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { addItem, removeItem, cartTotal, type CartItem } from "@/lib/cart";

const STORAGE_KEY = "aamir-cart";

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  isInCart: (productId: string) => boolean;
  total: number;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Cart starts empty on the server (and on first client render, to avoid a
  // hydration mismatch), then loads from localStorage once mounted.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // Corrupt or inaccessible storage — start with an empty cart.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full/unavailable — cart still works for this session.
    }
  }, [items, hydrated]);

  const value: CartContextValue = {
    items,
    addItem: (item) => setItems((current) => addItem(current, item)),
    removeItem: (productId) => setItems((current) => removeItem(current, productId)),
    isInCart: (productId) => items.some((i) => i.productId === productId),
    total: cartTotal(items),
    count: items.length,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
