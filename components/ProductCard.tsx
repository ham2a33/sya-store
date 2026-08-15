'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { formatPrice, type Product } from '../lib/products';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  const { addProduct } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(product.id);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product.id);
  };

  return (
    <article className="product">
      <Link
        href={`/product/${product.id}`}
        className="product-overlay-link"
        aria-label={product.name}
      />
      <button
        type="button"
        className={`heart${favorite ? ' heart--active' : ''}`}
        aria-label={favorite ? 'Убрать из избранного' : 'В избранное'}
        aria-pressed={favorite}
        onClick={handleFavorite}
      >
        <Heart size={17} fill={favorite ? 'currentColor' : 'none'} />
      </button>
      <img src={product.image} alt={product.name} />
      <div className="product-info">
        <h3>{product.name}</h3>
        <strong>{formatPrice(product.price)}</strong>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            addProduct(product.id);
          }}
          disabled={!product.inStock}
        >
          {product.inStock ? 'В КОРЗИНУ' : 'НЕТ В НАЛИЧИИ'}
        </button>
      </div>
    </article>
  );
}
