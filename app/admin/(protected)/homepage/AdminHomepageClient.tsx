'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '../../../../components/admin/AdminShell';
import DeleteBannerButton from '../../../../components/admin/DeleteBannerButton';
import { formatPrice, type Product } from '../../../../lib/products';
import type { Banner } from '../../../../lib/banners-store';

type AdminHomepageClientProps = {
  products: Product[];
};

export default function AdminHomepageClient({ products }: AdminHomepageClientProps) {
  const router = useRouter();
  const [rows, setRows] = useState(
    products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      isBestseller: Boolean(product.isBestseller),
      bestsellerOrder: product.bestsellerOrder ?? '',
      status: product.status ?? 'active',
    })),
  );
  const [banners, setBanners] = useState<Banner[]>([]);
  const [aboutImage, setAboutImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    const [homepageRes, bannersRes] = await Promise.all([
      fetch('/api/homepage?admin=true'),
      fetch('/api/banners?admin=true'),
    ]);
    const homepageData = (await homepageRes.json()) as { homepage: { aboutImage?: string } };
    const bannersData = (await bannersRes.json()) as { banners: Banner[] };
    setAboutImage(homepageData.homepage.aboutImage ?? '');
    setBanners(bannersData.banners ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData().catch(() => setLoading(false));
  }, [loadData]);

  const bestsellerRows = rows.filter((row) => row.status !== 'archived');

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const bestsellerUpdates = rows
        .filter((row) => row.isBestseller)
        .map((row) =>
          fetch(`/api/products/${row.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              isBestseller: true,
              bestsellerOrder: row.bestsellerOrder === '' ? null : Number(row.bestsellerOrder),
            }),
          }),
        );

      const removeUpdates = rows
        .filter((row) => !row.isBestseller)
        .map((row) =>
          fetch(`/api/products/${row.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isBestseller: false, bestsellerOrder: null }),
          }),
        );

      await Promise.all([
        ...bestsellerUpdates,
        ...removeUpdates,
        fetch('/api/homepage', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aboutImage }),
        }),
      ]);

      router.refresh();
    } catch {
      setError('Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file: File, onUrl: (url: string) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!response.ok) throw new Error('upload failed');
    const data = (await response.json()) as { url: string };
    onUrl(data.url);
  };

  const reorderBanner = async (id: string, direction: 'up' | 'down') => {
    setReordering(id);
    setError('');
    try {
      const response = await fetch(`/api/banners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      if (!response.ok) throw new Error('reorder failed');
      await loadData();
      router.refresh();
    } catch {
      setError('Не удалось изменить порядок');
    } finally {
      setReordering(null);
    }
  };

  if (loading) {
    return (
      <AdminShell title="Главная">
        <p className="admin-subtitle">Загрузка...</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Главная"
      subtitle="Бестселлеры, баннеры и изображения главной"
      actions={
        <>
          <a href="/" target="_blank" className="catalog-btn-text">
            Предпросмотр
          </a>
          <button type="button" className="dark-btn" onClick={save} disabled={saving}>
            {saving ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ'}
          </button>
        </>
      }
    >
      <section className="admin-section">
        <h2>БЕСТСЕЛЛЕРЫ</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Фото</th>
                <th>Товар</th>
                <th>Цена</th>
                <th>Бестселлер</th>
                <th>Порядок</th>
              </tr>
            </thead>
            <tbody>
              {bestsellerRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <img src={row.image} alt={row.name} className="admin-table-image" />
                  </td>
                  <td>{row.name}</td>
                  <td>{formatPrice(row.price)}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.isBestseller}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item) =>
                            item.id === row.id
                              ? { ...item, isBestseller: event.target.checked }
                              : item,
                          ),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      className="admin-inline-input"
                      value={row.bestsellerOrder}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item) =>
                            item.id === row.id
                              ? { ...item, bestsellerOrder: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <h2>БАННЕРЫ</h2>
          <Link href="/admin/homepage/banners/new" className="dark-btn">
            + ДОБАВИТЬ БАННЕР
          </Link>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Фото</th>
                <th>Название</th>
                <th>Статус</th>
                <th>Порядок</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {banners.map((banner, index) => (
                <tr key={banner.id}>
                  <td>
                    {banner.image ? (
                      <img src={banner.image} alt={banner.name} className="admin-table-image" />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{banner.name}</td>
                  <td>{banner.active ? 'Активен' : 'Выключен'}</td>
                  <td>
                    <div className="admin-inline-actions">
                      <span>{banner.sortOrder}</span>
                      <button
                        type="button"
                        className="admin-icon-btn"
                        title="Выше"
                        disabled={index === 0 || reordering === banner.id}
                        onClick={() => reorderBanner(banner.id, 'up')}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="admin-icon-btn"
                        title="Ниже"
                        disabled={index === banners.length - 1 || reordering === banner.id}
                        onClick={() => reorderBanner(banner.id, 'down')}
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="admin-inline-actions">
                      <Link
                        href={`/admin/homepage/banners/${banner.id}/edit`}
                        className="admin-icon-btn"
                        title="Редактировать"
                      >
                        ✏️
                      </Link>
                      <DeleteBannerButton
                        bannerId={banner.id}
                        bannerName={banner.name}
                        onDeleted={loadData}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {banners.length === 0 && (
                <tr>
                  <td colSpan={5}>Баннеры не найдены</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <h2>О БРЕНДЕ</h2>
        {aboutImage && <img src={aboutImage} alt="About" className="admin-preview-wide" />}
        <label className="admin-field">
          <span>Изображение блока «О бренде»</span>
          <input
            type="file"
            accept="image/*"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                await uploadImage(file, setAboutImage);
              } catch {
                setError('Не удалось загрузить изображение');
              }
            }}
          />
        </label>
      </section>

      {error && <p className="admin-error">{error}</p>}
    </AdminShell>
  );
}
