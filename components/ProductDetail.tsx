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

  const images = product.images.length ? product.images : product.image ? [product.image] : [];
  const characteristicMap = new Map(
    Object.entries(product.specifications ?? {}).filter(([, value]) => Boolean(value?.trim())),
  );
  if (product.material?.trim() && !characteristicMap.has('Материал')) {
    characteristicMap.set('Материал', product.material);
  }
  if (product.color?.trim() && !characteristicMap.has('Цвет')) {
    characteristicMap.set('Цвет', product.color);
  }
  if (product.size?.trim() && !characteristicMap.has('Размер')) {
    characteristicMap.set('Размер', product.size);
  }
  const characteristics = [...characteristicMap.entries()];

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
                {images.length ? <img src={images[activeImage]} alt={product.name} /> : <div className="product-image-placeholder" aria-label="Фото пока не добавлено" />}
              </div>
              {images.length > 1 && <div className="product-gallery-thumbs">
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
              </div>}
            </div>

            <div className="product-detail-info">
              <h1>{product.name}</h1>
              <p className="product-detail-price">{formatPrice(product.price)}</p>

              <div className="product-detail-stock">
                <span>Наличие</span>
                <strong>{product.inStock ? 'В наличии' : 'Нет в наличии'}</strong>
              </div>

              {characteristics.length > 0 && (
                <section className="product-specifications" aria-labelledby="product-specifications-title">
                  <h2 id="product-specifications-title">ХАРАКТЕРИСТИКИ</h2>
                  <dl>
                    {characteristics.map(([label, value]) => (
                      <div className="product-specification-row" key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {product.description?.trim() && (
                <div className="product-detail-about">
                  <h2>ОПИСАНИЕ</h2>
                  <p>{product.description}</p>
                </div>
              )}

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
                  <div className="delivery-payment-details">
                    <section className="delivery-payment-section" aria-labelledby="delivery-heading">
                      <h3 id="delivery-heading">Доставка</h3>
                      <div className="delivery-options">
                        <div className="delivery-option">
                          <strong>СДЭК</strong>
                          <div className="delivery-option-details">
                            <span>Стоимость <b>2 500–3 000 ₸</b></span>
                            <span>Срок <b>2–3 дня</b></span>
                          </div>
                        </div>
                        <div className="delivery-option">
                          <strong>Казпочта</strong>
                          <div className="delivery-option-details">
                            <span>Стоимость <b>1 460 ₸</b></span>
                            <span>Срок <b>5–7 дней</b></span>
                          </div>
                        </div>
                        <div className="delivery-option">
                          <strong>InDriver</strong>
                          <div className="delivery-option-details">
                            <span>Стоимость <b>4 000–5 000 ₸</b></span>
                            <span>Срок <b>1–2 дня</b></span>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="delivery-payment-section" aria-labelledby="payment-heading">
                      <h3 id="payment-heading">Способы оплаты</h3>
                      <ul className="payment-methods">
                        <li>Kaspi Рассрочка / Kaspi Red</li>
                        <li>Kaspi QR</li>
                        <li>Удалённая оплата через Kaspi</li>
                        <li>Наличными</li>
                      </ul>
                    </section>
                  </div>
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
