'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import HeroSlider from '../components/HeroSlider';
import ProductCard from '../components/ProductCard';
import HeaderActions from '../components/HeaderActions';
import {
  getBestsellerProducts,
  getNewCollectionProducts,
} from '../lib/products';
import { useProducts } from '../context/ProductsContext';
import { useHomepage, useActiveCategories } from '../context/StorefrontContext';

export default function HomePageClient() {
  const { products } = useProducts();
  const homepage = useHomepage();
  const categories = useActiveCategories();

  const newProducts = useMemo(() => getNewCollectionProducts(products), [products]);
  const bestsellers = useMemo(() => getBestsellerProducts(products), [products]);

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <a className="logo" href="#top">
            SYA <span>made to glow ✨</span>
          </a>
          <nav className="header-nav">
            <Link href="/catalog">КАТАЛОГ</Link>
            <a href="#bestsellers">БЕСТСЕЛЛЕРЫ</a>
            <a href="#about">О БРЕНДЕ</a>
            <a href="#contacts">КОНТАКТЫ</a>
          </nav>
          <div className="header-actions-wrap">
            <HeaderActions />
          </div>
        </div>
      </header>

      <main id="top">
        <HeroSlider slides={homepage.heroSlides} />

        <section className="section catalog-section" id="catalog">
          <div className="container">
            <div className="catalog-head">
              <h2>Каталог</h2>
              <Link href="/catalog">
                Все категории <ArrowRight size={14} strokeWidth={1.5} />
              </Link>
            </div>
            {categories.length > 0 ? (
              <div className="catalog-grid">
                {categories.map((category) => (
                  <Link
                    className="catalog-card"
                    key={category.slug}
                    href={`/catalog/${category.slug}`}
                  >
                    {category.image && (
                      <img
                        src={category.image}
                        alt={category.title}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="catalog-card-overlay" aria-hidden="true" />
                    <span className="catalog-card-label">{category.title}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="catalog-empty catalog-empty--home">
                Категории скоро появятся
              </p>
            )}
          </div>
        </section>

        <ProductSection title={homepage.newCollectionTitle} products={newProducts} />
        <ProductSection
          title={homepage.bestsellersTitle}
          products={bestsellers}
          id="bestsellers"
        />

        <section className="about" id="about">
          <div
            className="about-image"
            style={
              homepage.aboutImage
                ? { backgroundImage: `url('${homepage.aboutImage}')` }
                : undefined
            }
          />
          <div className="about-copy">
            <p className="eyebrow">О БРЕНДЕ SYA</p>
            <h2>Создано, чтобы сиять</h2>
            <p>
              SYA — это не просто украшения. Это детали, которые делают каждый
              момент особенным. Мы выбираем тонко качественные материалы и
              создаем украшения, которые остаются с вами надолго.
            </p>
            <button className="dark-btn">УЗНАТЬ БОЛЬШЕ</button>
          </div>
        </section>
      </main>

      <footer id="contacts">
        <div className="footer-brand">
          <div className="logo">
            SYA <span>made to glow ✨</span>
          </div>
          <p>
            Украшения, которые
            <br />
            подчеркивают вашу красоту
          </p>
        </div>
        <div>
          <h4>КАТАЛОГ</h4>
          <Link href="/catalog/rings">Кольца</Link>
          <Link href="/catalog/earrings">Серьги</Link>
          <Link href="/catalog/bracelets">Браслеты</Link>
          <Link href="/catalog/chains">Цепочки</Link>
          <Link href="/catalog/pendants">Подвески</Link>
        </div>
        <div>
          <h4>ИНФОРМАЦИЯ</h4>
          <a>О бренде</a>
          <a>Доставка и оплата</a>
          <a>Возврат и обмен</a>
          <a>Контакты</a>
        </div>
        <div>
          <h4>КОНТАКТЫ</h4>
          <a>+7 700 732 31 57</a>
          <a>@sya.buyer</a>
          <a>WhatsApp</a>
        </div>
        <div>
          <h4>МЫ ПРИНИМАЕМ</h4>
          <strong className="payments">kaspi &nbsp; VISA &nbsp; Mastercard</strong>
        </div>
        <small>© 2026 SYA — made to glow ✨. Все права защищены.</small>
      </footer>
    </>
  );
}

function ProductSection({
  title,
  products,
  id,
}: {
  title: string;
  products: ReturnType<typeof getBestsellerProducts>;
  id?: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="section" id={id}>
      <div className="container">
        <div className="section-head">
          <h2>{title}</h2>
          <Link href="/catalog">
            Смотреть все <ArrowRight size={14} strokeWidth={1.5} />
          </Link>
        </div>
        <div className="products" id="products">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
