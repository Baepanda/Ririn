import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

export interface CartItem {
  id: string;
  qr_code: string;
  name: string;
  photo_path?: string;
  karat?: string;
  weight_gram?: number | null;
  cost_price: number;
  sell_price: number;
}

interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, "sell_price"> & { sell_price?: number }) => boolean;
  remove: (id: string) => void;
  setPrice: (id: string, price: number) => void;
  clear: () => void;
  totalSell: number;
  totalCost: number;
}

const Ctx = createContext<CartState>({} as CartState);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const add = useCallback((item: Omit<CartItem, "sell_price"> & { sell_price?: number }) => {
    let added = false;
    setItems((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      added = true;
      return [...prev, { ...item, sell_price: item.sell_price ?? 0 }];
    });
    return added;
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const setPrice = useCallback((id: string, price: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, sell_price: price } : i)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const totalSell = useMemo(() => items.reduce((s, i) => s + (i.sell_price || 0), 0), [items]);
  const totalCost = useMemo(() => items.reduce((s, i) => s + (i.cost_price || 0), 0), [items]);

  return (
    <Ctx.Provider value={{ items, add, remove, setPrice, clear, totalSell, totalCost }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  return useContext(Ctx);
}
