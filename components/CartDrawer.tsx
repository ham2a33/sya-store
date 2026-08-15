'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import { formatPrice, type Product } from '../lib/products';
import { useCart } from '../context/CartContext';
import { useProducts } from '../context/ProductsContext';

type CartLineItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
};

function groupCartItems(
  itemIds: string[],
  getProduct: (id: string) => Product | undefined,
): CartLineItem[] {
  const quantities = new Map<string, number>();

  for (const id of itemIds) {
    if (typeof id !== 'string') continue;
    quantities.set(id, (quantities.get(id) ?? 0) + 1);
  }

  return Array.from(quantities.entries())
    .map(([id, quantity]) => {
      const product = getProduct(id);
      if (!product) return null;

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity,
      };
    })
    .filter((item): item is CartLineItem => item != null);
}

export default function CartDrawer() {
  const {
    cartOpen,
    closeCart,
    items,
    totalLabel,
    removeOneOf,
    addOneOf,
    removeProduct,
  } = useCart();
  const { getProduct } = useProducts();

  const lineItems = useMemo(() => groupCartItems(items, getProduct), [items, getProduct]);
  const isEmpty = lineItems.length === 0;

  if (!cartOpen) return null;

  return (
    <div className="overlay cart-overlay" onClick={closeCart}>
      <aside className="drawer cart-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head cart-drawer-head">
          <h3>КОРЗИНА</h3>
          <button type="button" aria-label="Закрыть корзину" onClick={closeCart}>
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>

        {isEmpty ? (
          <div className="cart-empty">
            <p>Ваша корзина пуста</p>
            <Link href="/catalog" className="dark-btn cart-empty-btn" onClick={closeCart}>
              ПЕРЕЙТИ В КАТАЛОГ
            </Link>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {lineItems.map((item) => (
                <article key={item.id} className="cart-item">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="cart-item-image"
                  />
                  <div className="cart-item-body">
                    <h4 className="cart-item-name">{item.name}</h4>
                    <p className="cart-item-price">{formatPrice(item.price)}</p>
                    <div className="cart-item-actions">
                      <div className="qty cart-item-qty">
                        <button
                          type="button"
                          aria-label="Уменьшить количество"
                          onClick={() => removeOneOf(item.id)}
                        >
                          <Minus size={16} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="Увеличить количество"
                          onClick={() => addOneOf(item.id)}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="cart-item-remove"
                        aria-label="Удалить товар"
                        onClick={() => removeProduct(item.id)}
                      >
                        <Trash2 size={18} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="cart-footer">
              <div className="cart-total">
                <span>ИТОГО</span>
                <strong>{totalLabel}</strong>
              </div>
              <Link
                href="/checkout"
                className="dark-btn cart-checkout-btn"
                onClick={closeCart}
              >
                ОФОРМИТЬ ЗАКАЗ
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
