"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { addItem, removeItem, cartTotal, type CartItem } from "@/lib/cart";

const STORAGE_KEY = "aamir-cart";
const EMPTY_ITEMS: CartItem[] = [];

// Module-level store so multiple CartProvider instances (and remounts)
// share one source of truth, kept in sync with localStorage. This lets us
// use useSyncExternalStore instead of useState+useEffect, avoiding the
// react-hooks/set-state-in-effect lint error (same fix as CraftSection).
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedItems: CartItem[] = EMPTY_ITEMS;

// Sentinel meaning "couldn't read storage this time". A read can throw where
// storage is blocked outright (Safari private browsing, cookie-blocking
// settings), and that is NOT the same as "storage is empty": returning null
// there would make getSnapshot see a changed value and wipe a perfectly valid
// in-memory cart. Instead we report "no change detectable" and keep serving
// the last known-good snapshot.
const UNREADABLE = Symbol("unreadable-storage");

function readRaw(): string | null | typeof UNREADABLE {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return UNREADABLE;
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// Re-checks localStorage on every call, but only parses a new array (and so
// only returns a new reference, which is what actually triggers a
// re-render) when the underlying stored value has actually changed.
function getSnapshot(): CartItem[] {
  const raw = readRaw();
  if (raw === UNREADABLE) return cachedItems;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedItems = raw ? JSON.parse(raw) : EMPTY_ITEMS;
    } catch {
      cachedItems = EMPTY_ITEMS;
    }
  }
  return cachedItems;
}

// Server (and pre-hydration client) render with an empty cart, so the first
// client render matches the server's and we avoid a hydration mismatch.
function getServerSnapshot(): CartItem[] {
  return EMPTY_ITEMS;
}

function commit(items: CartItem[]) {
  cachedItems = items;
  const serialized = JSON.stringify(items);
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
    cachedRaw = serialized;
  } catch {
    // Storage full/unavailable — keep the mutation in memory for this
    // session even though it won't survive a reload. Deliberately leave
    // cachedRaw untouched: it still matches what's actually persisted
    // (the write above never landed). If we instead set it to `serialized`
    // (what we tried to write) or to null, the next getSnapshot() call
    // (triggered by the notify below) would see cachedRaw no longer match
    // the real localStorage content, re-derive cachedItems from that real
    // (unwritten, stale) content, and silently revert this mutation.
  }
  listeners.forEach((listener) => listener());
}

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  isInCart: (productId: string) => boolean;
  total: number;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value: CartContextValue = {
    items,
    addItem: (item) => commit(addItem(getSnapshot(), item)),
    removeItem: (productId) => commit(removeItem(getSnapshot(), productId)),
    // Used after a completed purchase: goes through the same store commit as
    // every other mutation, so persistence and subscriber notification behave
    // identically.
    clear: () => commit(EMPTY_ITEMS),
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
