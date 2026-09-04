export type CartItem = {
  productId: string;
  slug: string;
  categorySlug: string;
  title: { it?: string; en?: string };
  price: number;
  imageUrl?: string;
};

export function addItem(items: CartItem[], item: CartItem): CartItem[] {
  if (items.some((i) => i.productId === item.productId)) return items;
  return [...items, item];
}

export function removeItem(items: CartItem[], productId: string): CartItem[] {
  return items.filter((i) => i.productId !== productId);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price, 0);
}
