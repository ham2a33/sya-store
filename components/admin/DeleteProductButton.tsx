'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type DeleteProductButtonProps = {
  productId: string;
  productName: string;
};

export default function DeleteProductButton({
  productId,
  productName,
}: DeleteProductButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('delete failed');
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button type="button" className="admin-link-danger" onClick={() => setOpen(true)}>
        Удалить
      </button>
      {open && (
        <div className="admin-modal-overlay" onClick={() => setOpen(false)}>
          <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Удалить товар?</h3>
            <p>{productName}</p>
            <p className="admin-modal-note">
              Товар будет архивирован и скрыт из каталога. История заказов не пострадает.
            </p>
            <div className="admin-form-actions">
              <button type="button" className="catalog-btn-text" onClick={() => setOpen(false)}>
                ОТМЕНА
              </button>
              <button
                type="button"
                className="dark-btn admin-danger-btn"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? 'УДАЛЕНИЕ...' : 'УДАЛИТЬ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
