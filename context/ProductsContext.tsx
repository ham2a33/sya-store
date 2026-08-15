'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { Product } from '../lib/products';

type ProductsContextValue = {
  products: Product[];
  getProduct: (id: string) => Product | undefined;
  setProducts: (products: Product[]) => void;
};

const ProductsContext = createContext<ProductsContextValue | null>(null);

export function ProductsProvider({
  initialProducts,
  children,
}: {
  initialProducts: Product[];
  children: React.ReactNode;
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);

  const getProduct = useCallback(
    (id: string) => products.find((product) => product.id === id),
    [products],
  );

  const value = useMemo(
    () => ({
      products,
      getProduct,
      setProducts,
    }),
    [products, getProduct],
  );

  return (
    <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProducts must be used within ProductsProvider');
  }
  return context;
}
