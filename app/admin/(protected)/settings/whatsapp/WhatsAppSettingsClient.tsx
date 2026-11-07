'use client';

import { useEffect, useState } from 'react';
import AdminShell from '../../../../../components/admin/AdminShell';
import type { WhatsAppSettings } from '../../../../../lib/site-settings-store';
import { DEFAULT_WHATSAPP_TEMPLATE, buildWhatsAppOrderUrl, openWhatsAppOrder, renderWhatsAppTemplate } from '../../../../../lib/whatsapp-order';

const INITIAL_SETTINGS: WhatsAppSettings = {
  phone: '',
  enabled: false,
  messageTemplate: DEFAULT_WHATSAPP_TEMPLATE,
};

export default function WhatsAppSettingsClient() {
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetch('/api/settings/whatsapp', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Не удалось загрузить настройки');
        const data = (await response.json()) as { whatsapp: WhatsAppSettings };
        setSettings(data.whatsapp);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить настройки'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/settings/whatsapp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = (await response.json()) as { whatsapp?: WhatsAppSettings; error?: string };
      if (!response.ok || !data.whatsapp) throw new Error(data.error ?? 'Не удалось сохранить настройки');
      setSettings(data.whatsapp);
      setNotice('Настройки WhatsApp сохранены.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить настройки');
    } finally {
      setSaving(false);
    }
  };

  const testWhatsApp = () => {
    setError('');
    setNotice('');
    const phone = settings.phone.replace(/\D/g, '');
    if (!/^\d{8,15}$/.test(phone)) {
      setError('Сначала укажите корректный номер с кодом страны.');
      return;
    }
    const message = renderWhatsAppTemplate(settings.messageTemplate, {
      items: '1. Тестовый товар\n   Артикул: TEST-001\n   Количество: 1\n   Цена: 1 000 ₸',
      total: '1 000 ₸',
      name: 'Тестовый покупатель',
      phone: '+7 700 000 00 00',
      email: 'test@example.com',
      city: 'Алматы',
      address: 'Тестовый адрес',
      deliveryMethod: 'Доставка',
      comment: 'Тестовое сообщение WhatsApp',
    });
    if (!openWhatsAppOrder(buildWhatsAppOrderUrl(phone, message))) {
      setError('Браузер заблокировал новое окно. Разрешите всплывающие окна и повторите проверку.');
      return;
    }
    setNotice('Открыто тестовое сообщение. Оно ещё не отправлено.');
  };

  return (
    <AdminShell title="Настройки магазина → WhatsApp" subtitle="Номер и сообщение для заказов через WhatsApp">
      {loading ? <p className="admin-subtitle">Загрузка...</p> : (
        <section className="admin-section">
          <form className="admin-form" onSubmit={save}>
            <label className="admin-field">
              <span>Номер WhatsApp магазина (с кодом страны)</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="7XXXXXXXXXX"
                value={settings.phone}
                onChange={(event) => setSettings((current) => ({ ...current, phone: event.target.value }))}
              />
              <small>Укажите только цифры или международный номер, например 77007323157.</small>
            </label>
            <label className="admin-field" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))}
              />
              <span>WhatsApp включён</span>
            </label>
            <label className="admin-field">
              <span>Шаблон сообщения заказа</span>
              <textarea
                rows={18}
                value={settings.messageTemplate}
                onChange={(event) => setSettings((current) => ({ ...current, messageTemplate: event.target.value }))}
              />
              <small>Поля: {'{{items}}'}, {'{{total}}'}, {'{{name}}'}, {'{{phone}}'}, {'{{email}}'}, {'{{city}}'}, {'{{address}}'}, {'{{deliveryMethod}}'}, {'{{comment}}'}.</small>
            </label>
            {error && <p className="checkout-form-error" role="alert">{error}</p>}
            {notice && <p role="status">{notice}</p>}
            <div className="admin-form-actions">
              <button type="submit" className="dark-btn" disabled={saving}>
                {saving ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ НАСТРОЙКИ'}
              </button>
              <button type="button" className="catalog-btn-text" onClick={testWhatsApp}>
                ПРОВЕРИТЬ WHATSAPP
              </button>
            </div>
          </form>
        </section>
      )}
    </AdminShell>
  );
}
