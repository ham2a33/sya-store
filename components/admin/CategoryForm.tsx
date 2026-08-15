'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from './AdminShell';
import { normalizeSlug } from '../../lib/category-utils';
import type { StoredCategory } from '../../lib/types';

type CategoryFormValues = {
  title: string;
  slug: string;
  description: string;
  image: string;
  sortOrder: string;
  active: boolean;
};

type CategoryFormProps = {
  mode: 'create' | 'edit';
  initialCategory?: StoredCategory;
  nextSortOrder?: number;
};

function toFormValues(category?: StoredCategory, nextSortOrder = 1): CategoryFormValues {
  return {
    title: category?.title ?? '',
    slug: category?.slug ?? '',
    description: category?.description ?? '',
    image: category?.image ?? '',
    sortOrder: category ? String(category.sortOrder) : String(nextSortOrder),
    active: category?.active ?? true,
  };
}

export default function CategoryForm({
  mode,
  initialCategory,
  nextSortOrder = 1,
}: CategoryFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<CategoryFormValues>(() =>
    toFormValues(initialCategory, nextSortOrder),
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const title = mode === 'create' ? 'Добавить категорию' : 'Редактировать категорию';
  const sortOrderNumber = useMemo(() => Number(values.sortOrder) || 1, [values.sortOrder]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('upload failed');
      const data = (await response.json()) as { url: string };
      setValues((current) => ({ ...current, image: data.url }));
    } catch {
      setError('Не удалось загрузить изображение');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      title: values.title.trim(),
      slug: normalizeSlug(values.slug),
      description: values.description.trim(),
      image: values.image.trim(),
      sortOrder: sortOrderNumber,
      active: values.active,
    };

    if (!payload.title || !payload.slug || !payload.image) {
      setError('Укажите название, slug и изображение');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(
        mode === 'create'
          ? '/api/categories'
          : `/api/categories/${initialCategory?.slug}`,
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? 'save failed');
      }

      router.push('/admin/categories');
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить категорию');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title={title}
      subtitle="Категория каталога и главной страницы"
      actions={
        <button type="button" className="catalog-btn-text" onClick={() => router.back()}>
          НАЗАД
        </button>
      }
    >
      <form className="admin-stack" onSubmit={handleSubmit}>
        <label className="admin-field">
          <span>Название</span>
          <input
            value={values.title}
            onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
            placeholder="Кольца"
            required
          />
        </label>

        <label className="admin-field">
          <span>Slug</span>
          <input
            value={values.slug}
            onChange={(event) => setValues((current) => ({ ...current, slug: event.target.value }))}
            placeholder="rings"
            required
          />
        </label>

        <div className="admin-field">
          <span>Изображение</span>
          {values.image && (
            <img src={values.image} alt={values.title || 'Category'} className="admin-preview-wide" />
          )}
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              await uploadFile(file);
            }}
          />
          {uploading && <p className="admin-subtitle">Загрузка...</p>}
        </div>

        <label className="admin-field">
          <span>Описание (необязательно)</span>
          <textarea
            value={values.description}
            onChange={(event) =>
              setValues((current) => ({ ...current, description: event.target.value }))
            }
            rows={3}
          />
        </label>

        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Порядок</span>
            <input
              type="number"
              min={1}
              value={values.sortOrder}
              onChange={(event) =>
                setValues((current) => ({ ...current, sortOrder: event.target.value }))
              }
            />
          </label>

          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={values.active}
              onChange={(event) =>
                setValues((current) => ({ ...current, active: event.target.checked }))
              }
            />
            <span>Активна</span>
          </label>
        </div>

        {error && <p className="admin-error">{error}</p>}

        <div className="admin-form-actions">
          <button type="submit" className="dark-btn" disabled={saving || uploading}>
            {saving ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ'}
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
