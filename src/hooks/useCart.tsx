import { useEffect, useState, useCallback } from "react";

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  image_url?: string | null;
  quantity: number;
  max_stock?: number;
  unlimited?: boolean;
}

const keyFor = (slug: string) => `pg_cart_${slug}`;

export const useCart = (slug: string) => {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    if (!slug) return;
    try {
      const raw = localStorage.getItem(keyFor(slug));
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, [slug]);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    try { localStorage.setItem(keyFor(slug), JSON.stringify(next)); } catch {}
  }, [slug]);

  const add = (it: Omit<CartItem, "quantity">, qty = 1) => {
    const existing = items.find(i => i.product_id === it.product_id);
    const max = it.unlimited ? Infinity : (it.max_stock ?? 99);
    if (existing) {
      const newQty = Math.min(existing.quantity + qty, max);
      persist(items.map(i => i.product_id === it.product_id ? { ...i, quantity: newQty } : i));
    } else {
      persist([...items, { ...it, quantity: Math.min(qty, max) }]);
    }
  };

  const setQty = (product_id: string, qty: number) => {
    if (qty <= 0) return remove(product_id);
    persist(items.map(i => {
      if (i.product_id !== product_id) return i;
      const max = i.unlimited ? Infinity : (i.max_stock ?? 99);
      return { ...i, quantity: Math.min(qty, max) };
    }));
  };

  const remove = (product_id: string) => persist(items.filter(i => i.product_id !== product_id));
  const clear = () => persist([]);

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return { items, add, setQty, remove, clear, total, count };
};
