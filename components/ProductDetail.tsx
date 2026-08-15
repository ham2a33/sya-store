'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, ChevronDown } from 'lucide-react';
import {
  formatPrice,
  getCategoryFromList,
  getSimilarProductsFromList,
  type Product,
} from '../lib/products';
import { useProducts } from '../context/ProductsContext';
import { useStorefront } from '../context/StorefrontContext';
import { useCart } from '../context/CartContext';
import ProductCard from './ProductCard';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';

function AccordionItem({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`accordion-item${open ? ' accordion-item--open' : ''}`}>
      <button
        type="button"
        className="accordion-trigger"
        onClick={() => setOpen((v) => !v)}
      >
        {title}
        <ChevronDown size={16} />
      </button>
      {open && <div className="accordion-content">{children}</div>}
    </div>
  );
}

export default function ProductDetail({ product }: { product: Product }) {
  const { categories } = useStorefront();
  const category = getCategoryFromList(categories, product.category);
  const { products } = useProducts();
  const similar = getSimilarProductsFromList(products, product, 4);
  const { addProduct } = useCart();
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const images = product.images.length ? product.images : [product.image];

  const handleAdd = () => {
    addProduct(product.id, quantity);
  };

  return (
    <>
      <SiteHeader />
      <main className="product-page">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Навигация">
            <Link href="/catalog">КАТАЛОГ</Link>
            <span>/</span>
            {category && (
              <>
                <Link href={`/catalog/${category.slug}`}>
                  {category.title.toUpperCase()}
                </Link>
                <span>/</span>
              </>
            )}
            <span>{product.name.toUpperCase()}</span>
          </nav>

          <div className="product-detail">
            <div className="product-gallery">
              <div className="product-gallery-main">
                <img src={images[activeImage]} alt={product.name} />
              </div>
              <div className="product-gallery-thumbs">
                {images.map((image, index) => (
                  <button
                    key={image + index}
                    type="button"
                    className={`product-thumb${
                      index === activeImage ? ' product-thumb--active' : ''
                    }`}
                    onClick={() => setActiveImage(index)}
                  >
                    <img src={image} alt="" />
                  </button>
                ))}
              </div>
            </div>

            <div className="product-detail-info">
              <h1>{product.name}</h1>
              <p className="product-detail-price">{formatPrice(product.price)}</p>

              <div className="product-detail-stock">
                <span>Наличие</span>
                <strong>{product.inStock ? 'В наличии' : 'Нет в наличии'}</strong>
              </div>

              {product.material && (
                <div className="product-detail-meta">
                  <span>Материал</span>
                  <strong>{product.material}</strong>
                </div>
              )}
              {product.color && (
                <div className="product-detail-meta">
                  <span>Цвет</span>
                  <strong>{product.color}</strong>
                </div>
              )}
              {product.size && (
                <div className="product-detail-meta">
                  <span>Размер</span>
                  <strong>{product.size}</strong>
                </div>
              )}

              <div className="product-detail-about">
                <h2>О ТОВАРЕ</h2>
                <p>{product.description}</p>
              </div>

              <div className="product-detail-qty">
                <span>Количество</span>
                <div className="qty">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Minus size={16} />
                  </button>
                  <span>{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <button
                className="dark-btn product-add-btn"
                onClick={handleAdd}
                disabled={!product.inStock}
              >
                ДОБАВИТЬ В КОРЗИНУ
              </button>

              <div className="product-accordions">
                <AccordionItem title="Доставка и оплата">
                  <p>
                    Доставка по Казахстану 2–5 рабочих дней. Оплата картой,
                    Kaspi или при получении — в зависимости от региона.
                  </p>
                </AccordionItem>
                <AccordionItem title="Возврат">
                  <p>
                    Возврат и обмен возможны в течение 14 дней при сохранении
                    товарного вида и упаковки.
                  </p>
                </AccordionItem>
              </div>
            </div>
          </div>

          {similar.length > 0 && (
            <section className="similar-section">
              <div className="section-head">
                <h2>ПОХОЖИЕ ТОВАРЫ</h2>
              </div>
              <div className="products products-catalog products-catalog--4">
                {similar.map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
