'use client';

import { useState } from 'react';
import AdminShell from '../../../../components/admin/AdminShell';

export default function AdminSecurityPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (newPassword.length < 8) {
      setError('Новый пароль должен содержать не менее 8 символов.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Новые пароли не совпадают.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? 'Не удалось изменить пароль.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice(result.message ?? 'Пароль успешно изменён. Выйдите и войдите с новым паролем.');
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Не удалось изменить пароль.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell title="Безопасность" subtitle="Изменение пароля администратора">
      <section className="admin-section">
        <form className="admin-form" onSubmit={changePassword}>
          <label className="admin-field">
            <span>Текущий пароль</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </label>
          <label className="admin-field">
            <span>Новый пароль</span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              required
            />
            <small>Не менее 8 символов.</small>
          </label>
          <label className="admin-field">
            <span>Повторите новый пароль</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>
          {error && <p className="checkout-form-error" role="alert">{error}</p>}
          {notice && <p role="status">{notice}</p>}
          <div className="admin-form-actions">
            <button type="submit" className="dark-btn" disabled={saving}>
              {saving ? 'СОХРАНЕНИЕ...' : 'ИЗМЕНИТЬ ПАРОЛЬ'}
            </button>
          </div>
        </form>
      </section>
    </AdminShell>
  );
}
