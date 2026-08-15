'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import type { Category, Product } from '../lib/products';
import type { HomepageConfig } from '../lib/types';

type StorefrontContextValue = {
  categories: Category[];
  homepage: HomepageConfig;
  getCategory: (slug: string) => Category | undefined;
  activeCategories: Category[];
};

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

export function StorefrontProvider({
  categories,
  homepage,
  children,
}: {
  categories: Category[];
  homepage: HomepageConfig;
  children: React.ReactNode;
}) {
  const getCategory = useCallback(
    (slug: string) => categories.find((category) => category.slug === slug),
    [categories],
  );

  const activeCategories = useMemo(
    () =>
      [...categories]
        .filter(
          (category) =>
            category.active !== false && category.status !== 'archived',
        )
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [categories],
  );

  const value = useMemo(
    () => ({
      categories,
      homepage,
      getCategory,
      activeCategories,
    }),
    [categories, homepage, getCategory, activeCategories],
  );

  return (
    <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>
  );
}

export function useStorefront() {
  const context = useContext(StorefrontContext);
  if (!context) {
    throw new Error('useStorefront must be used within StorefrontProvider');
  }
  return context;
}

export function useCategories(): Category[] {
  return useStorefront().categories;
}

export function useActiveCategories(): Category[] {
  return useStorefront().activeCategories;
}

export function useHomepage(): HomepageConfig {
  return useStorefront().homepage;
}
