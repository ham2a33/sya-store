'use client';

import { useEffect, useState } from 'react';
import AdminShell from '../../../../components/admin/AdminShell';
import type { MediaItem, MediaUsage } from '../../../../lib/types';

export default function AdminMediaClient() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{
    item: MediaItem;
    usages: MediaUsage[];
  } | null>(null);

  const load = () => {
    fetch('/api/media')
      .then((res) => res.json())
      .then((data) => {
        setMedia(data.media ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const upload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!response.ok) {
      setError('Не удалось загрузить файл');
      return;
    }
    load();
  };

  const requestDelete = async (item: MediaItem) => {
    const response = await fetch(`/api/media?id=${item.id}`, { method: 'DELETE' });
    if (response.status === 409) {
      const data = (await response.json()) as { usages: MediaUsage[] };
      setPendingDelete({ item, usages: data.usages });
      return;
    }
    if (!response.ok) {
      setError('Не удалось удалить файл');
      return;
    }
    load();
  };

  const forceDelete = async () => {
    if (!pendingDelete) return;
    await fetch(`/api/media?id=${pendingDelete.item.id}&force=true`, { method: 'DELETE' });
    setPendingDelete(null);
    load();
  };

  return (
    <AdminShell
      title="Медиа"
      subtitle="Загрузка и управление изображениями магазина"
      actions={
        <label className="dark-btn admin-upload-label">
          ЗАГРУЗИТЬ
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload(file);
            }}
          />
        </label>
      }
    >
      {loading ? (
        <p className="admin-subtitle">Загрузка...</p>
      ) : (
        <div className="admin-media-grid">
          {media.map((item) => (
            <article key={item.id} className="admin-media-card">
              <img src={item.url} alt={item.filename} />
              <div className="admin-media-meta">
                <strong>{item.filename}</strong>
                <span>{item.url}</span>
                <button type="button" className="admin-link-danger" onClick={() => requestDelete(item)}>
                  Удалить
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {pendingDelete && (
        <div className="admin-modal-overlay" onClick={() => setPendingDelete(null)}>
          <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Это изображение используется в {pendingDelete.usages.length} местах</h3>
            <ul className="admin-usage-list">
              {pendingDelete.usages.map((usage) => (
                <li key={`${usage.type}-${usage.id}`}>{usage.label}</li>
              ))}
            </ul>
            <div className="admin-form-actions">
              <button type="button" className="catalog-btn-text" onClick={() => setPendingDelete(null)}>
                ОТМЕНА
              </button>
              <button type="button" className="dark-btn admin-danger-btn" onClick={forceDelete}>
                УДАЛИТЬ ВСЁ РАВНО
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="admin-error">{error}</p>}
    </AdminShell>
  );
}
