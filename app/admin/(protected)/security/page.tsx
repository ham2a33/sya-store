'use client';

import { useEffect, useState } from 'react';
import AdminShell from '../../../../components/admin/AdminShell';

export default function AdminSecurityPage() {
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailNotice, setEmailNotice] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(true);
  const [savingEmail, setSavingEmail] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Не удалось загрузить email администратора.');
        const result = await response.json() as { user?: { email?: string } | null };
        if (!result.user?.email) throw new Error('Не удалось определить email администратора.');
        setEmail(result.user.email);
      })
      .catch((loadError: unknown) => setEmailError(
        loadError instanceof Error ? loadError.message : 'Не удалось загрузить email администратора.',
      ))
      .finally(() => setLoadingEmail(false));
  }, []);

  const changeEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailError('');
    setEmailNotice('');
    setSavingEmail(true);
    try {
      const response = await fetch('/api/admin/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, currentPassword: emailPassword }),
      });
      const result = await response.json() as { user?: { email: string }; error?: string; message?: string };
      if (!response.ok || !result.user?.email) {
        throw new Error(result.error ?? 'Не удалось изменить email.');
      }
      setEmail(result.user.email);
      setNewEmail('');
      setEmailPassword('');
      setEmailNotice(result.message ?? 'Email успешно изменён. Текущая сессия сохранена.');
    } catch (changeError) {
      setEmailError(changeError instanceof Error ? changeError.message : 'Не удалось изменить email.');
    } finally {
      setSavingEmail(false);
    }
  };

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
    <AdminShell title="Безопасность" subtitle="Управление email и паролем администратора">
      <section className="admin-section">
        <h2>Изменение email</h2>
        <form className="admin-form" onSubmit={changeEmail}>
          <label className="admin-field">
            <span>Текущий email</span>
            <input type="email" value={loadingEmail ? '' : email} readOnly placeholder={loadingEmail ? 'Загрузка...' : ''} />
          </label>
          <label className="admin-field">
            <span>Новый email</span>
            <input
              type="email"
              autoComplete="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              maxLength={254}
              required
            />
          </label>
          <label className="admin-field">
            <span>Текущий пароль для подтверждения</span>
            <input
              type="password"
              autoComplete="current-password"
              value={emailPassword}
              onChange={(event) => setEmailPassword(event.target.value)}
              required
            />
          </label>
          {emailError && <p className="checkout-form-error" role="alert">{emailError}</p>}
          {emailNotice && <p role="status">{emailNotice}</p>}
          <div className="admin-form-actions">
            <button type="submit" className="dark-btn" disabled={savingEmail || loadingEmail}>
              {savingEmail ? 'СОХРАНЕНИЕ...' : 'ИЗМЕНИТЬ EMAIL'}
            </button>
          </div>
        </form>
      </section>
      <section className="admin-section">
        <h2>Изменение пароля</h2>
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
