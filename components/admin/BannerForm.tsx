'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from './AdminShell';
import type { Banner } from '../../lib/banners-store';

type BannerFormValues = {
  name: string;
  image: string;
  eyebrow: string;
  headline: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  sortOrder: string;
  active: boolean;
};

type BannerFormProps = {
  mode: 'create' | 'edit';
  initialBanner?: Banner;
  nextSortOrder?: number;
};

function toFormValues(banner?: Banner, nextSortOrder = 1): BannerFormValues {
  return {
    name: banner?.name ?? '',
    image: banner?.image ?? '',
    eyebrow: banner?.eyebrow ?? '',
    headline: banner?.headline ?? '',
    title: banner?.title ?? '',
    subtitle: banner?.subtitle ?? '',
    cta: banner?.cta ?? 'СМОТРЕТЬ КОЛЛЕКЦИЮ',
    href: banner?.href ?? '/catalog',
    sortOrder: banner ? String(banner.sortOrder) : String(nextSortOrder),
    active: banner?.active ?? true,
  };
}

export default function BannerForm({ mode, initialBanner, nextSortOrder = 1 }: BannerFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<BannerFormValues>(() =>
    toFormValues(initialBanner, nextSortOrder),
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const title = mode === 'create' ? 'Добавить баннер' : 'Редактировать баннер';
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
      name: values.name.trim(),
      image: values.image.trim(),
      eyebrow: values.eyebrow.trim() || undefined,
      headline: values.headline.trim() || undefined,
      title: values.title.trim() || undefined,
      subtitle: values.subtitle.trim() || undefined,
      cta: values.cta.trim(),
      href: values.href.trim(),
      sortOrder: sortOrderNumber,
      active: values.active,
    };

    if (!payload.name || !payload.image) {
      setError('Укажите название и изображение');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(
        mode === 'create' ? '/api/banners' : `/api/banners/${initialBanner?.id}`,
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

      router.push('/admin/homepage');
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить баннер');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title={title}
      subtitle="Hero-слайд на главной странице"
      actions={
        <button type="button" className="catalog-btn-text" onClick={() => router.back()}>
          НАЗАД
        </button>
      }
    >
      <form className="admin-stack" onSubmit={handleSubmit}>
        <label className="admin-field">
          <span>Название баннера</span>
          <input
            value={values.name}
            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            placeholder="Summer Collection"
            required
          />
        </label>

        <div className="admin-field">
          <span>Изображение</span>
          {values.image && (
            <img src={values.image} alt={values.name || 'Banner'} className="admin-preview-wide" />
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

        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Eyebrow (необязательно)</span>
            <input
              value={values.eyebrow}
              onChange={(event) =>
                setValues((current) => ({ ...current, eyebrow: event.target.value }))
              }
              placeholder="NEW COLLECTION"
            />
          </label>

          <label className="admin-field">
            <span>Заголовок</span>
            <input
              value={values.headline}
              onChange={(event) =>
                setValues((current) => ({ ...current, headline: event.target.value }))
              }
              placeholder="SUMMER COLLECTION"
            />
          </label>

          <label className="admin-field">
            <span>Доп. заголовок (необязательно)</span>
            <input
              value={values.title}
              onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
              placeholder="НА ИЗБРАННЫЕ УКРАШЕНИЯ"
            />
          </label>

          <label className="admin-field">
            <span>Подзаголовок (необязательно)</span>
            <textarea
              value={values.subtitle}
              onChange={(event) =>
                setValues((current) => ({ ...current, subtitle: event.target.value }))
              }
              placeholder="Сияйте этим летом вместе с SYA"
              rows={3}
            />
          </label>

          <label className="admin-field">
            <span>Текст кнопки</span>
            <input
              value={values.cta}
              onChange={(event) => setValues((current) => ({ ...current, cta: event.target.value }))}
              placeholder="СМОТРЕТЬ КОЛЛЕКЦИЮ"
            />
          </label>

          <label className="admin-field">
            <span>Ссылка кнопки</span>
            <input
              value={values.href}
              onChange={(event) => setValues((current) => ({ ...current, href: event.target.value }))}
              placeholder="/catalog"
            />
          </label>

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
            <span>Активен</span>
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
