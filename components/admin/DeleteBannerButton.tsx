'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type DeleteBannerButtonProps = {
  bannerId: string;
  bannerName: string;
  onDeleted?: () => void;
};

export default function DeleteBannerButton({
  bannerId,
  bannerName,
  onDeleted,
}: DeleteBannerButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/banners/${bannerId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('delete failed');
      setOpen(false);
      onDeleted?.();
      router.refresh();
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
        <div className="admin-modal-overlay" onClick={() => setOpen(false)}>
          <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Удалить баннер?</h3>
            <p>{bannerName}</p>
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
