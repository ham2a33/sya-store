'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import CartDrawer from '../components/CartDrawer';
import { formatPrice } from '../lib/products';
import { useProducts } from './ProductsContext';

const STORAGE_KEY = 'sya-cart';

type CartContextValue = {
  items: string[];
  sizes: Record<string, string>;
  count: number;
  total: number;
  totalLabel: string;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addProduct: (productId: string, quantity?: number) => void;
  removeOne: () => void;
  addOne: () => void;
  removeOneOf: (productId: string) => void;
  addOneOf: (productId: string) => void;
  removeProduct: (productId: string) => void;
  setProductSize: (productId: string, size: string) => void;
  clearCart: () => void;
  getProductName: (productId: string) => string;
};

const CartContext = createContext<CartContextValue | null>(null);

function loadCartFromStorage(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

function saveCartToStorage(items: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadCartSizesFromStorage(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-sizes`);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
  } catch {
    return {};
  }
}

function saveCartSizesToStorage(sizes: Record<string, string>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${STORAGE_KEY}-sizes`, JSON.stringify(sizes));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { getProduct } = useProducts();
  const [items, setItems] = useState<string[]>([]);
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(loadCartFromStorage());
    setSizes(loadCartSizesFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveCartToStorage(items);
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const productIds = new Set(items);
    setSizes((current) => {
      const next = Object.fromEntries(Object.entries(current).filter(([id]) => productIds.has(id)));
      saveCartSizesToStorage(next);
      return next;
    });
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveCartSizesToStorage(sizes);
  }, [sizes, hydrated]);

  const addProduct = useCallback(
    (productId: string, quantity = 1) => {
      setItems((current) => {
        const product = getProduct(productId);
        if (!product || !product.inStock) return current;

        const currentQty = current.filter((id) => id === productId).length;
        const allowed = Math.max(0, (product.stock ?? 0) - currentQty);
        const toAdd = Math.min(quantity, allowed);
        if (toAdd <= 0) return current;

        return [
          ...current,
          ...Array.from({ length: toAdd }, () => productId),
        ];
      });
      setCartOpen(true);
    },
    [getProduct],
  );

  const removeOne = useCallback(() => {
    setItems((current) => current.slice(0, -1));
  }, []);

  const addOne = useCallback(() => {
    setItems((current) => {
      if (current.length === 0) return current;
      return [...current, current[current.length - 1]];
    });
  }, []);

  const removeOneOf = useCallback((productId: string) => {
    setItems((current) => {
      const index = current.lastIndexOf(productId);
      if (index === -1) return current;
      return [...current.slice(0, index), ...current.slice(index + 1)];
    });
  }, []);

  const addOneOf = useCallback(
    (productId: string) => {
      setItems((current) => {
        const product = getProduct(productId);
        if (!product || !product.inStock) return current;

        const currentQty = current.filter((id) => id === productId).length;
        if (currentQty >= (product.stock ?? 0)) return current;

        return [...current, productId];
      });
    },
    [getProduct],
  );

  const removeProduct = useCallback((productId: string) => {
    setItems((current) => current.filter((id) => id !== productId));
  }, []);

  const setProductSize = useCallback((productId: string, size: string) => {
    setSizes((current) => ({ ...current, [productId]: size }));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const total = useMemo(
    () =>
      items.reduce((sum, id) => {
        const product = getProduct(id);
        return sum + (product?.price ?? 0);
      }, 0),
    [items, getProduct],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      sizes,
      count: items.length,
      total,
      totalLabel: formatPrice(total),
      cartOpen,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
      addProduct,
      removeOne,
      addOne,
      removeOneOf,
      addOneOf,
      removeProduct,
      setProductSize,
      clearCart,
      getProductName: (productId) => getProduct(productId)?.name ?? 'Товар',
    }),
    [items, sizes, total, cartOpen, addProduct, removeOne, addOne, removeOneOf, addOneOf, removeProduct, setProductSize, clearCart, getProduct],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
