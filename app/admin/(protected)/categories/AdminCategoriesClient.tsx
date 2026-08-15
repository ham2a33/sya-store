'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '../../../../components/admin/AdminShell';
import DeleteCategoryButton from '../../../../components/admin/DeleteCategoryButton';
import type { StoredCategory } from '../../../../lib/types';

type AdminCategoriesClientProps = {
  initialCategories: StoredCategory[];
  productCounts: Record<string, number>;
};

export default function AdminCategoriesClient({
  initialCategories,
  productCounts,
}: AdminCategoriesClientProps) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [reordering, setReordering] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState('');

  const visibleCategories = categories.filter((category) => category.status !== 'archived');
  const archivedCategories = categories.filter((category) => category.status === 'archived');

  const refreshCategories = useCallback(async () => {
    const response = await fetch('/api/categories?admin=true');
    const data = (await response.json()) as { categories: StoredCategory[] };
    setCategories(data.categories ?? []);
  }, []);

  const reorderCategory = async (slug: string, direction: 'up' | 'down') => {
    setReordering(slug);
    setError('');
    try {
      const response = await fetch(`/api/categories/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      if (!response.ok) throw new Error('reorder failed');
      await refreshCategories();
      router.refresh();
    } catch {
      setError('Не удалось изменить порядок');
    } finally {
      setReordering(null);
    }
  };

  const restoreCategory = async (slug: string) => {
    setRestoring(slug);
    setError('');
    try {
      const response = await fetch(`/api/categories/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      });
      if (!response.ok) throw new Error('restore failed');
      await refreshCategories();
      router.refresh();
    } catch {
      setError('Не удалось восстановить категорию');
    } finally {
      setRestoring(null);
    }
  };

  return (
    <AdminShell
      title="Категории"
      subtitle="Управление каталогом, главной и фильтрами"
      actions={
        <Link href="/admin/categories/new" className="dark-btn">
          + ДОБАВИТЬ КАТЕГОРИЮ
        </Link>
      }
    >
      <section className="admin-section">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Фото</th>
                <th>Название</th>
                <th>Slug</th>
                <th>Товаров</th>
                <th>Статус</th>
                <th>Порядок</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {visibleCategories.map((category, index) => (
                <tr key={category.slug}>
                  <td>
                    {category.image ? (
                      <img src={category.image} alt={category.title} className="admin-table-image" />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{category.title}</td>
                  <td>{category.slug}</td>
                  <td>{productCounts[category.slug] ?? 0}</td>
                  <td>{category.active ? 'Активна' : 'Выключена'}</td>
                  <td>
                    <div className="admin-inline-actions">
                      <span>{category.sortOrder}</span>
                      <button
                        type="button"
                        className="admin-icon-btn"
                        title="Выше"
                        disabled={index === 0 || reordering === category.slug}
                        onClick={() => reorderCategory(category.slug, 'up')}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="admin-icon-btn"
                        title="Ниже"
                        disabled={
                          index === visibleCategories.length - 1 || reordering === category.slug
                        }
                        onClick={() => reorderCategory(category.slug, 'down')}
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="admin-inline-actions">
                      <Link
                        href={`/admin/categories/${category.slug}/edit`}
                        className="admin-icon-btn"
                        title="Редактировать"
                      >
                        ✏️
                      </Link>
                      <DeleteCategoryButton
                        category={category}
                        productCount={productCounts[category.slug] ?? 0}
                        transferTargets={visibleCategories.filter(
                          (item) => item.slug !== category.slug,
                        )}
                        onChanged={refreshCategories}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {visibleCategories.length === 0 && (
                <tr>
                  <td colSpan={7}>Категории не найдены</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {archivedCategories.length > 0 && (
        <section className="admin-section">
          <h2>АРХИВ</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Slug</th>
                  <th>Товаров</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {archivedCategories.map((category) => (
                  <tr key={category.slug}>
                    <td>{category.title}</td>
                    <td>{category.slug}</td>
                    <td>{productCounts[category.slug] ?? 0}</td>
                    <td>
                      <button
                        type="button"
                        className="catalog-btn-text"
                        disabled={restoring === category.slug}
                        onClick={() => restoreCategory(category.slug)}
                      >
                        {restoring === category.slug ? 'ВОССТАНОВЛЕНИЕ...' : 'ВОССТАНОВИТЬ'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {error && <p className="admin-error">{error}</p>}
    </AdminShell>
  );
}
