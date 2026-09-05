"use client";

import { useEffect } from "react";
import { useCart } from "./CartProvider";

// Rendered by the checkout success page (a Server Component) purely for its
// effect: the purchase went through, so the cart must not survive into the
// next visit. Renders nothing.
export function ClearCartOnMount() {
  const { clear } = useCart();

  useEffect(() => {
    clear();
    // Runs once on mount: `clear` is recreated on every provider render, so
    // depending on it would re-empty the cart on unrelated re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
