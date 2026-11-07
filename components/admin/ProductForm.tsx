'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from './AdminShell';
import { formatPrice, type Product } from '../../lib/products';
import { useStorefront } from '../../context/StorefrontContext';
import type { CategorySlug } from '../../lib/products.types';

type ProductFormValues = {
  id: string;
  name: string;
  price: string;
  oldPrice: string;
  category: CategorySlug;
  stock: string;
  description: string;
  material: string;
  color: string;
  size: string;
  image: string;
  images: string[];
  isNew: boolean;
  popular: boolean;
  status: 'active' | 'archived' | 'draft';
};

type ProductFormProps = {
  mode: 'create' | 'edit';
  initialProduct?: Product;
};

function toFormValues(product?: Product): ProductFormValues {
  return {
    id: product?.id ?? '',
    name: product?.name ?? '',
    price: product ? String(product.price) : '',
    oldPrice: product?.oldPrice ? String(product.oldPrice) : '',
    category: product?.category ?? 'rings',
    stock: product?.stock == null ? '' : String(product.stock),
    description: product?.description ?? '',
    material: product?.material ?? '',
    color: product?.color ?? '',
    size: product?.size ?? '',
    image: product?.image ?? '',
    images: product?.images?.length ? product.images : product?.image ? [product.image] : [],
    isNew: product?.isNew ?? false,
    popular: product?.popular ?? false,
    status: product?.status === 'draft' ? 'draft' : product?.status === 'archived' ? 'archived' : 'active',
  };
}

export default function ProductForm({ mode, initialProduct }: ProductFormProps) {
  const router = useRouter();
  const { categories } = useStorefront();
  const [values, setValues] = useState<ProductFormValues>(() => toFormValues(initialProduct));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const title = mode === 'create' ? 'Добавить товар' : 'Редактировать товар';
  const stockNumber = useMemo(() => Number(values.stock) || 0, [values.stock]);
  const extraImages = values.images.filter((url) => url !== values.image);

  const uploadFile = async (file: File, onUrl: (url: string) => void) => {
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('upload failed');
      const data = (await response.json()) as { url: string };
      onUrl(data.url);
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

    const images = values.images.length
      ? values.images
      : values.image
        ? [values.image]
        : [];

    const payload = {
      ...values,
      price: Number(values.price),
      oldPrice: values.oldPrice ? Number(values.oldPrice) : undefined,
      stock: values.stock === '' ? null : Number(values.stock),
      image: values.image || images[0],
      images,
    };

    try {
      const response = await fetch(
        mode === 'create' ? '/api/products' : `/api/products/${initialProduct?.id}`,
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

      router.push('/admin/products');
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error && saveError.message === 'Product already exists'
          ? 'Товар с таким артикулом уже существует'
          : 'Не удалось сохранить товар',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell title={title}>
      <form className="admin-form admin-product-form" onSubmit={handleSubmit}>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Название</span>
            <input
              value={values.name}
              onChange={(event) => setValues({ ...values, name: event.target.value })}
              required
            />
          </label>
          <label className="admin-field">
            <span>Артикул / ID</span>
            <input
              value={values.id}
              onChange={(event) => setValues({ ...values, id: event.target.value })}
              required
              disabled={mode === 'edit'}
            />
          </label>
          <label className="admin-field">
            <span>Категория</span>
            <select
              value={values.category}
              onChange={(event) =>
                setValues({ ...values, category: event.target.value as CategorySlug })
              }
            >
              {categories
                .filter((category) => category.status !== 'archived')
                .map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.title}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Цена</span>
            <input
              type="number"
              min={0}
              value={values.price}
              onChange={(event) => setValues({ ...values, price: event.target.value })}
              required
            />
          </label>
          <label className="admin-field">
            <span>Старая цена</span>
            <input
              type="number"
              min={0}
              value={values.oldPrice}
              onChange={(event) => setValues({ ...values, oldPrice: event.target.value })}
            />
          </label>
          <label className="admin-field">
            <span>Остаток</span>
            <input
              type="number"
              min={0}
              value={values.stock}
              onChange={(event) => setValues({ ...values, stock: event.target.value })}
              required
            />
          </label>
          <label className="admin-field">
            <span>Материал</span>
            <input
              value={values.material}
              onChange={(event) => setValues({ ...values, material: event.target.value })}
            />
          </label>
          <label className="admin-field">
            <span>Цвет</span>
            <input
              value={values.color}
              onChange={(event) => setValues({ ...values, color: event.target.value })}
            />
          </label>
          <label className="admin-field">
            <span>Размер</span>
            <input
              value={values.size}
              onChange={(event) => setValues({ ...values, size: event.target.value })}
            />
          </label>
          <label className="admin-field">
            <span>Статус</span>
            <select
              value={values.status}
              onChange={(event) =>
                setValues({
                  ...values,
                  status: event.target.value as 'active' | 'archived' | 'draft',
                })
              }
            >
              <option value="active">Активен</option>
              <option value="draft">Черновик</option>
              <option value="archived">Архив</option>
            </select>
          </label>
        </div>

        <label className="admin-field">
          <span>Описание</span>
          <textarea
            rows={5}
            value={values.description}
            onChange={(event) => setValues({ ...values, description: event.target.value })}
            required
          />
        </label>

        <div className="admin-upload-block">
          <h3>Основное изображение</h3>
          {values.image && (
            <div className="admin-image-preview admin-image-preview--main">
              <img src={values.image} alt="Основное изображение" />
            </div>
          )}
          <label className="admin-field">
            <span>Загрузить основное изображение</span>
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                uploadFile(file, (url) =>
                  setValues((current) => ({
                    ...current,
                    image: url,
                    images: [url, ...current.images.filter((item) => item !== url)],
                  })),
                );
              }}
            />
          </label>
        </div>

        <div className="admin-upload-block">
          <h3>Дополнительные изображения</h3>
          <div className="admin-gallery-grid">
            {extraImages.map((url) => (
              <div key={url} className="admin-gallery-item">
                <img src={url} alt="" />
                <div className="admin-gallery-actions">
                  <button
                    type="button"
                    className="catalog-btn-text"
                    onClick={() => setValues((current) => ({ ...current, image: url }))}
                  >
                    Сделать основным
                  </button>
                  <button
                    type="button"
                    className="admin-link-danger"
                    onClick={() =>
                      setValues((current) => ({
                        ...current,
                        images: current.images.filter((item) => item !== url),
                      }))
                    }
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
          <label className="admin-field">
            <span>+ Добавить фото</span>
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                uploadFile(file, (url) =>
                  setValues((current) => ({
                    ...current,
                    images: current.images.includes(url)
                      ? current.images
                      : [...current.images, url],
                  })),
                );
              }}
            />
          </label>
        </div>

        <div className="admin-checkboxes">
          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={values.isNew}
              onChange={(event) => setValues({ ...values, isNew: event.target.checked })}
            />
            <span>Новинка</span>
          </label>
          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={values.popular}
              onChange={(event) => setValues({ ...values, popular: event.target.checked })}
            />
            <span>Популярный</span>
          </label>
        </div>

        <p className="admin-stock-hint">
          {stockNumber > 0 ? `В наличии: ${stockNumber} шт.` : 'Нет в наличии'}
          {values.price ? ` · ${formatPrice(Number(values.price))}` : ''}
        </p>

        {error && <p className="admin-error">{error}</p>}

        <div className="admin-form-actions">
          <button type="button" className="catalog-btn-text" onClick={() => router.back()}>
            Отмена
          </button>
          <button type="submit" className="dark-btn" disabled={saving || uploading}>
            {saving ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ'}
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
