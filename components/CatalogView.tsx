'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, X } from 'lucide-react';
import {
  getCategoryFromList,
  pluralizeProducts,
  type CategorySlug,
  type Product,
} from '../lib/products';
import { searchProducts } from '../lib/search';
import { useFavorites } from '../context/FavoritesContext';
import { useProducts } from '../context/ProductsContext';
import { useStorefront } from '../context/StorefrontContext';
import ProductGrid from './ProductGrid';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';

type SortOption = 'new' | 'price-asc' | 'price-desc' | 'popular';
type CatalogMode = 'catalog' | 'search' | 'favorites';

type CatalogViewProps = {
  categorySlug?: CategorySlug;
  mode?: CatalogMode;
};

const SORT_LABELS: Record<SortOption, string> = {
  new: 'Новинки',
  'price-asc': 'Цена ↑',
  'price-desc': 'Цена ↓',
  popular: 'Популярные',
};

const SORT_URL: Record<SortOption, string> = {
  new: 'new',
  'price-asc': 'price_asc',
  'price-desc': 'price_desc',
  popular: 'popular',
};

const SORT_FROM_URL: Record<string, SortOption> = {
  new: 'new',
  popular: 'popular',
  'price-asc': 'price-asc',
  'price-desc': 'price-desc',
  price_asc: 'price-asc',
  price_desc: 'price-desc',
};

function sortProducts(products: Product[], sort: SortOption): Product[] {
  const list = [...products];
  switch (sort) {
    case 'new':
      return list.sort((a, b) => Number(b.isNew) - Number(a.isNew));
    case 'price-asc':
      return list.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return list.sort((a, b) => b.price - a.price);
    default:
      return list.sort((a, b) => Number(b.popular) - Number(a.popular));
  }
}

function parseSort(value: string | null): SortOption {
  if (!value) return 'new';
  return SORT_FROM_URL[value] ?? 'new';
}

function parsePrice(value: string | null): number | null {
  if (!value) return null;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function buildQueryString(params: URLSearchParams): string {
  const query = params.toString();
  return query ? `?${query}` : '';
}

export default function CatalogView({
  categorySlug,
  mode = 'catalog',
}: CatalogViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sortRef = useRef<HTMLDivElement>(null);
  const { favorites } = useFavorites();
  const { products: allProducts } = useProducts();
  const { categories, activeCategories } = useStorefront();

  const category = categorySlug ? getCategoryFromList(categories, categorySlug) : undefined;
  const searchQuery = searchParams.get('q') ?? '';
  const trimmedQuery = searchQuery.trim();

  const [categoryFilter, setCategoryFilter] = useState<CategorySlug | 'all'>(
    categorySlug ?? 'all',
  );
  const [minPrice, setMinPrice] = useState(
    () => searchParams.get('minPrice') ?? '',
  );
  const [maxPrice, setMaxPrice] = useState(
    () => searchParams.get('maxPrice') ?? '',
  );
  const [stock, setStock] = useState<'all' | 'in-stock' | 'out-of-stock'>(() => {
    const value = searchParams.get('stock');
    return value === 'in-stock' || value === 'out-of-stock' ? value : 'all';
  });
  const [sort, setSort] = useState<SortOption>(() =>
    parseSort(searchParams.get('sort')),
  );
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [appliedMin, setAppliedMin] = useState(
    parsePrice(searchParams.get('minPrice')),
  );
  const [appliedMax, setAppliedMax] = useState(
    parsePrice(searchParams.get('maxPrice')),
  );
  const [appliedStock, setAppliedStock] = useState(stock);

  const buildParams = useCallback(
    (overrides: {
      sort?: SortOption;
      min?: number | null;
      max?: number | null;
      stock?: 'all' | 'in-stock' | 'out-of-stock';
      q?: string;
    }) => {
      const params = new URLSearchParams();
      const sortValue = overrides.sort ?? sort;
      const minValue = overrides.min !== undefined ? overrides.min : appliedMin;
      const maxValue = overrides.max !== undefined ? overrides.max : appliedMax;
      const stockValue = overrides.stock ?? appliedStock;
      const queryValue = overrides.q !== undefined ? overrides.q : searchQuery;

      if (mode === 'search' && queryValue) params.set('q', queryValue);
      if (sortValue !== 'new') params.set('sort', SORT_URL[sortValue]);
      if (minValue != null) params.set('minPrice', String(minValue));
      if (maxValue != null) params.set('maxPrice', String(maxValue));
      if (stockValue !== 'all') params.set('stock', stockValue);

      return params;
    },
    [appliedMax, appliedMin, appliedStock, mode, searchQuery, sort],
  );

  const syncUrl = useCallback(
    (overrides: {
      sort?: SortOption;
      min?: number | null;
      max?: number | null;
      stock?: 'all' | 'in-stock' | 'out-of-stock';
      q?: string;
    }) => {
      const params = buildParams(overrides);
      router.replace(`${pathname}${buildQueryString(params)}`, { scroll: false });
    },
    [buildParams, pathname, router],
  );

  useEffect(() => {
    setSort(parseSort(searchParams.get('sort')));
    setAppliedMin(parsePrice(searchParams.get('minPrice')));
    setAppliedMax(parsePrice(searchParams.get('maxPrice')));
    const stockParam = searchParams.get('stock');
    const nextStock =
      stockParam === 'in-stock' || stockParam === 'out-of-stock'
        ? stockParam
        : 'all';
    setAppliedStock(nextStock);
    setStock(nextStock);
    setMinPrice(searchParams.get('minPrice') ?? '');
    setMaxPrice(searchParams.get('maxPrice') ?? '');
  }, [searchParams]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSortOpen(false);
        setFiltersOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const baseProducts = useMemo(() => {
    if (mode === 'favorites') {
      return allProducts.filter((product) => favorites.includes(product.id));
    }
    if (mode === 'search') {
      if (!trimmedQuery) return [];
      return searchProducts(trimmedQuery, allProducts, categories);
    }
    if (categorySlug) {
      return allProducts.filter((product) => product.category === categorySlug);
    }
    return allProducts;
  }, [allProducts, categorySlug, favorites, mode, trimmedQuery]);

  const filteredProducts = useMemo(() => {
    let list = [...baseProducts];

    if (mode === 'catalog' && !categorySlug && categoryFilter !== 'all') {
      list = list.filter((product) => product.category === categoryFilter);
    }

    if (mode === 'search' && categoryFilter !== 'all') {
      list = list.filter((product) => product.category === categoryFilter);
    }

    if (appliedMin != null) list = list.filter((product) => product.price >= appliedMin);
    if (appliedMax != null) list = list.filter((product) => product.price <= appliedMax);
    if (appliedStock === 'in-stock') list = list.filter((product) => product.inStock);
    if (appliedStock === 'out-of-stock') {
      list = list.filter((product) => !product.inStock);
    }

    return sortProducts(list, sort);
  }, [
    appliedMax,
    appliedMin,
    appliedStock,
    baseProducts,
    categoryFilter,
    categorySlug,
    mode,
    sort,
  ]);

  const countText = pluralizeProducts(filteredProducts.length);
  const hasActiveFilters =
    appliedMin != null ||
    appliedMax != null ||
    appliedStock !== 'all' ||
    (mode === 'catalog' && !categorySlug && categoryFilter !== 'all') ||
    (mode === 'search' && categoryFilter !== 'all');

  const handleSortChange = (value: SortOption) => {
    setSort(value);
    setSortOpen(false);
    syncUrl({ sort: value });
  };

  const applyFilters = () => {
    const min = minPrice.trim() ? parsePrice(minPrice) : null;
    const max = maxPrice.trim() ? parsePrice(maxPrice) : null;
    const params = buildParams({ min, max, stock });

    if (mode === 'catalog' && !categorySlug && categoryFilter !== 'all') {
      setFiltersOpen(false);
      router.push(`/catalog/${categoryFilter}${buildQueryString(params)}`);
      return;
    }

    setAppliedMin(min);
    setAppliedMax(max);
    setAppliedStock(stock);
    setFiltersOpen(false);
    router.replace(`${pathname}${buildQueryString(params)}`, { scroll: false });
  };

  const resetFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setStock('all');
    setCategoryFilter(categorySlug ?? 'all');
    setAppliedMin(null);
    setAppliedMax(null);
    setAppliedStock('all');
    setFiltersOpen(false);
    syncUrl({ min: null, max: null, stock: 'all' });
  };

  const showSearchPrompt = mode === 'search' && !trimmedQuery;
  const showSearchEmpty = mode === 'search' && trimmedQuery && filteredProducts.length === 0;
  const showFavoritesEmpty = mode === 'favorites' && filteredProducts.length === 0;
  const showCatalogEmpty =
    mode === 'catalog' && filteredProducts.length === 0 && !showSearchPrompt;

  const filtersForm = (
    <div className="catalog-filters-form">
      {mode === 'catalog' && !categorySlug && (
        <>
          <div className="catalog-field">
            <span>Категории</span>
            <div className="catalog-category-links">
              <Link
                href="/catalog"
                className={`catalog-category-link${
                  categoryFilter === 'all' ? ' catalog-category-link--active' : ''
                }`}
                onClick={() => setFiltersOpen(false)}
              >
                Все категории
              </Link>
              {activeCategories.map((item) => (
                <Link
                  key={item.slug}
                  href={`/catalog/${item.slug}`}
                  className="catalog-category-link"
                  onClick={() => setFiltersOpen(false)}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
          <label className="catalog-field">
            <span>Фильтр по категории</span>
            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as CategorySlug | 'all')
              }
            >
              <option value="all">Все категории</option>
              {activeCategories.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {mode === 'search' && (
        <label className="catalog-field">
          <span>Категория</span>
          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as CategorySlug | 'all')
            }
          >
            <option value="all">Все категории</option>
            {activeCategories.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="catalog-price-row">
        <label className="catalog-field">
          <span>Цена от</span>
          <input
            type="number"
            min={0}
            placeholder="0"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
        </label>
        <label className="catalog-field">
          <span>Цена до</span>
          <input
            type="number"
            min={0}
            placeholder="∞"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </label>
      </div>
      <label className="catalog-field">
        <span>Наличие</span>
        <select
          value={stock}
          onChange={(e) =>
            setStock(e.target.value as 'all' | 'in-stock' | 'out-of-stock')
          }
        >
          <option value="all">Все</option>
          <option value="in-stock">В наличии</option>
          <option value="out-of-stock">Нет в наличии</option>
        </select>
      </label>
      <div className="catalog-filters-actions">
        <button type="button" className="catalog-btn-text" onClick={resetFilters}>
          Сбросить
        </button>
        <button
          type="button"
          className="dark-btn catalog-btn-apply"
          onClick={applyFilters}
        >
          ПРИМЕНИТЬ
        </button>
      </div>
    </div>
  );

  const topbarTitle = (() => {
    if (mode === 'search') {
      if (!trimmedQuery) {
        return (
          <>
            <h1 className="catalog-topbar-heading">ПОИСК</h1>
            <span className="catalog-topbar-count">Поиск товаров</span>
          </>
        );
      }
      return (
        <>
          <h1 className="catalog-topbar-heading">ПОИСК</h1>
          <span className="catalog-topbar-query">
            Результаты для: «{trimmedQuery}»
          </span>
          <span className="catalog-topbar-dot">·</span>
          <span className="catalog-topbar-count">{countText}</span>
        </>
      );
    }

    if (mode === 'favorites') {
      return (
        <>
          <h1 className="catalog-topbar-heading">ИЗБРАННОЕ</h1>
          <span className="catalog-topbar-dot">·</span>
          <span className="catalog-topbar-count">{countText}</span>
        </>
      );
    }

    return (
      <>
        <Link
          href="/catalog"
          className={`catalog-nav-link${
            !categorySlug ? ' catalog-nav-link--active' : ''
          }`}
        >
          КАТАЛОГ
        </Link>
        {category && (
          <>
            <span className="catalog-topbar-sep">/</span>
            <span className="catalog-topbar-category">
              {category.title.toUpperCase()}
            </span>
          </>
        )}
        <span className="catalog-topbar-dot">·</span>
        <span className="catalog-topbar-count">{countText}</span>
      </>
    );
  })();

  return (
    <>
      <SiteHeader />
      <main className="catalog-page">
        <div className="container">
          <div className="catalog-topbar">
            <div className="catalog-topbar-title">{topbarTitle}</div>
            {!showSearchPrompt && (
              <div className="catalog-topbar-actions">
                <div className="catalog-dropdown" ref={sortRef}>
                  <button
                    type="button"
                    className="catalog-action-btn"
                    onClick={() => setSortOpen((v) => !v)}
                    aria-expanded={sortOpen}
                    aria-haspopup="listbox"
                  >
                    СОРТИРОВКА
                    <ChevronDown size={14} />
                  </button>
                  {sortOpen && (
                    <div className="catalog-dropdown-menu" role="listbox">
                      {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                        <button
                          key={key}
                          type="button"
                          role="option"
                          aria-selected={sort === key}
                          className={`catalog-dropdown-item${
                            sort === key ? ' catalog-dropdown-item--active' : ''
                          }`}
                          onClick={() => handleSortChange(key)}
                        >
                          {SORT_LABELS[key]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className={`catalog-action-btn${
                    hasActiveFilters ? ' catalog-action-btn--active' : ''
                  }`}
                  onClick={() => setFiltersOpen(true)}
                  aria-expanded={filtersOpen}
                >
                  ФИЛЬТРЫ
                </button>
              </div>
            )}
          </div>

          {showSearchPrompt && (
            <div className="catalog-empty catalog-empty--prompt">
              <p>Введите название товара, категорию или артикул</p>
            </div>
          )}

          {!showSearchPrompt && filteredProducts.length > 0 && (
            <ProductGrid products={filteredProducts} />
          )}

          {showSearchEmpty && (
            <div className="catalog-empty">
              <p>По вашему запросу ничего не найдено</p>
              <Link href="/catalog" className="catalog-empty-link">
                ← Вернуться в каталог
              </Link>
            </div>
          )}

          {showFavoritesEmpty && (
            <div className="catalog-empty">
              <p>В избранном пока нет товаров</p>
              <Link href="/catalog" className="catalog-empty-link">
                Перейти в каталог
              </Link>
            </div>
          )}

          {showCatalogEmpty && (
            <div className="catalog-empty">
              <p>
                {baseProducts.length === 0
                  ? 'В этой категории пока нет товаров'
                  : 'Товары не найдены. Измените фильтры.'}
              </p>
              <Link href="/catalog" className="catalog-empty-link">
                Перейти в каталог
              </Link>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />

      {filtersOpen && (
        <div className="overlay" onClick={() => setFiltersOpen(false)}>
          <aside
            className="drawer filters-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-head">
              <h3>Фильтры</h3>
              <button
                type="button"
                aria-label="Закрыть фильтры"
                onClick={() => setFiltersOpen(false)}
              >
                <X />
              </button>
            </div>
            {filtersForm}
          </aside>
        </div>
      )}
    </>
  );
}
