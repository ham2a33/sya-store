'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminRecoverPage() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/admin/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ token: token.replace(/\s+/g, ''), email, password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof result.error === 'string' ? result.error : 'Не удалось восстановить доступ.');
        return;
      }
      setToken('');
      setPassword('');
      setComplete(true);
      setMessage('Доступ восстановлен. Теперь войдите с новым email и паролем.');
    } catch {
      setError('Не удалось связаться с сервером.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <div className="admin-login-card">
        <Link href="/admin/login" className="admin-login-logo">
          SYA <span>admin</span>
        </Link>
        <h1>Восстановление доступа</h1>
        {complete ? (
          <>
            <p role="status">{message}</p>
            <Link className="dark-btn admin-submit" href="/admin/login">Перейти ко входу</Link>
          </>
        ) : (
          <form className="admin-form" onSubmit={handleSubmit}>
            <label className="admin-field">
              <span>Recovery token</span>
              <input
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                required
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label className="admin-field">
              <span>Новый email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <label className="admin-field">
              <span>Новый пароль</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <p>Используйте пароль длиной не менее 8 символов.</p>
            {error && <p className="admin-error" role="alert">{error}</p>}
            <button type="submit" className="dark-btn admin-submit" disabled={loading}>
              {loading ? 'ВОССТАНОВЛЕНИЕ…' : 'ВОССТАНОВИТЬ ДОСТУП'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
