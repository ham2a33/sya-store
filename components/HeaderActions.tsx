'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Search, Heart, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import SearchOverlay from './SearchOverlay';

export default function HeaderActions() {
  const { count, openCart } = useCart();
  const { count: favoritesCount } = useFavorites();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <div className="actions">
        <button
          type="button"
          aria-label="Поиск"
          onClick={() => setSearchOpen(true)}
        >
          <Search size={20} strokeWidth={1.5} />
        </button>
        <Link href="/favorites" aria-label="Избранное" className="actions-fav">
          <Heart size={20} strokeWidth={1.5} />
          {favoritesCount > 0 && <b>{favoritesCount}</b>}
        </Link>
        <button type="button" aria-label="Корзина" onClick={openCart}>
          <ShoppingBag size={20} strokeWidth={1.5} />
          <b>{count}</b>
        </button>
      </div>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
