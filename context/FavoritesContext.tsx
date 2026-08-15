'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getFavorites, FAV_KEY } from '../lib/favorites';

type FavoritesContextValue = {
  favorites: string[];
  count: number;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => boolean;
  addFavorite: (productId: string) => void;
  removeFavorite: (productId: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function saveFavorites(items: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FAV_KEY, JSON.stringify(items));
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setFavorites(getFavorites());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveFavorites(favorites);
  }, [favorites, hydrated]);

  const isFavorite = useCallback(
    (productId: string) => favorites.includes(productId),
    [favorites],
  );

  const addFavorite = useCallback((productId: string) => {
    setFavorites((current) =>
      current.includes(productId) ? current : [...current, productId],
    );
  }, []);

  const removeFavorite = useCallback((productId: string) => {
    setFavorites((current) => current.filter((id) => id !== productId));
  }, []);

  const toggleFavorite = useCallback((productId: string): boolean => {
    let nextState = false;
    setFavorites((current) => {
      if (current.includes(productId)) {
        nextState = false;
        return current.filter((id) => id !== productId);
      }
      nextState = true;
      return [...current, productId];
    });
    return nextState;
  }, []);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favorites,
      count: favorites.length,
      isFavorite,
      toggleFavorite,
      addFavorite,
      removeFavorite,
    }),
    [favorites, isFavorite, toggleFavorite, addFavorite, removeFavorite],
  );

  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return context;
}
