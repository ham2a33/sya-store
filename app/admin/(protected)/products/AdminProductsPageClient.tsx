'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '../../../../components/admin/AdminShell';
import DeleteProductButton from '../../../../components/admin/DeleteProductButton';
import { formatPrice, type Product } from '../../../../lib/products';
import { useStorefront } from '../../../../context/StorefrontContext';

type AdminProductsPageClientProps = {
  products: Product[];
  adminEmail: string;
};

export default function AdminProductsPageClient({
  products,
  adminEmail,
}: AdminProductsPageClientProps) {
  const router = useRouter();
  const { categories } = useStorefront();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [sort, setSort] = useState('name');

  const filtered = useMemo(() => {
    let list = [...products];

    if (query.trim()) {
      const normalized = query.trim().toLowerCase();
      list = list.filter(
        (product) =>
          product.name.toLowerCase().includes(normalized) ||
          product.id.toLowerCase().includes(normalized),
      );
    }

    if (category !== 'all') {
      list = list.filter((product) => product.category === category);
    }

    if (stockFilter === 'in-stock') {
      list = list.filter((product) => (product.stock ?? 0) > 0 && product.status !== 'archived');
    }
    if (stockFilter === 'out-of-stock') {
      list = list.filter((product) => (product.stock ?? 0) <= 0 || product.status === 'archived');
    }

    list.sort((a, b) => {
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'stock') return (b.stock ?? 0) - (a.stock ?? 0);
      return a.name.localeCompare(b.name, 'ru');
    });

    return list;
  }, [products, query, category, stockFilter, sort]);

  const restoreProduct = async (productId: string) => {
    await fetch(`/api/products/${productId}?restore=true`, { method: 'DELETE' });
    router.refresh();
  };

  return (
    <AdminShell
      title="Товары"
      subtitle={adminEmail}
      actions={
        <Link href="/admin/products/new" className="dark-btn">
          + ДОБАВИТЬ ТОВАР
        </Link>
      }
    >
      <div className="admin-filters">
        <input
          type="search"
          placeholder="Поиск по названию или артикулу"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">Все категории</option>
          {categories.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.title}
            </option>
          ))}
        </select>
        <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>
          <option value="all">Все остатки</option>
          <option value="in-stock">В наличии</option>
          <option value="out-of-stock">Нет в наличии / архив</option>
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="name">По названию</option>
          <option value="price-asc">Цена ↑</option>
          <option value="price-desc">Цена ↓</option>
          <option value="stock">По остатку</option>
        </select>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Фото</th>
              <th>Название</th>
              <th>Артикул</th>
              <th>Цена</th>
              <th>Остаток</th>
              <th>Статус</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr key={product.id}>
                <td>
                  {product.image ? <img src={product.image} alt={product.name} className="admin-table-image" /> : <div className="admin-table-image product-image-placeholder" aria-label="Фото пока не добавлено" />}
                </td>
                <td>{product.name}</td>
                <td>{product.id}</td>
                <td>{formatPrice(product.price)}</td>
                <td>{product.stock ?? 'Не указан'}</td>
                <td>
                  {product.status === 'draft'
                    ? 'Черновик'
                    : product.status === 'archived'
                    ? 'Архив'
                    : (product.stock ?? 0) > 0
                      ? 'В наличии'
                      : 'Нет в наличии'}
                </td>
                <td className="admin-table-actions">
                  <Link href={`/admin/products/${product.id}/edit`}>Редактировать</Link>
                  {product.status === 'archived' ? (
                    <button
                      type="button"
                      className="admin-link-restore"
                      onClick={() => restoreProduct(product.id)}
                    >
                      Восстановить
                    </button>
                  ) : (
                    <DeleteProductButton productId={product.id} productName={product.name} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
