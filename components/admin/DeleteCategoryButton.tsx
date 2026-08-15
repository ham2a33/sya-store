'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StoredCategory } from '../../lib/types';

type DeleteCategoryButtonProps = {
  category: StoredCategory;
  productCount: number;
  transferTargets: StoredCategory[];
  onChanged?: () => void;
};

export default function DeleteCategoryButton({
  category,
  productCount,
  transferTargets,
  onChanged,
}: DeleteCategoryButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transferTo, setTransferTo] = useState('');
  const [error, setError] = useState('');

  const close = () => {
    setOpen(false);
    setError('');
    setTransferTo('');
  };

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/categories/${category.slug}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productCount > 0 ? { transferTo } : {}),
      });

      if (response.status === 409) {
        const data = (await response.json()) as { productCount?: number; error?: string };
        setError(
          `В категории ${data.productCount ?? productCount} товаров. Выберите категорию для переноса.`,
        );
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? 'delete failed');
      }

      close();
      onChanged?.();
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'Не удалось удалить категорию',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="admin-icon-btn admin-link-danger"
        title="Удалить"
        onClick={() => setOpen(true)}
      >
        🗑
      </button>
      {open && (
        <div className="admin-modal-overlay" onClick={close}>
          <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Удалить категорию «{category.title}»?</h3>
            {productCount > 0 ? (
              <>
                <p>В категории {productCount} товаров.</p>
                <label className="admin-field">
                  <span>Куда перенести товары?</span>
                  <select
                    value={transferTo}
                    onChange={(event) => setTransferTo(event.target.value)}
                  >
                    <option value="">Выберите категорию</option>
                    {transferTargets.map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <p>Категория будет удалена без удаления товаров.</p>
            )}
            {error && <p className="admin-error">{error}</p>}
            <div className="admin-form-actions">
              <button type="button" className="catalog-btn-text" onClick={close}>
                ОТМЕНА
              </button>
              <button
                type="button"
                className="dark-btn admin-danger-btn"
                onClick={handleDelete}
                disabled={loading || (productCount > 0 && !transferTo)}
              >
                {loading
                  ? 'УДАЛЕНИЕ...'
                  : productCount > 0
                    ? 'ПЕРЕНЕСТИ И УДАЛИТЬ'
                    : 'УДАЛИТЬ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
