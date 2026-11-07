import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '../../../../lib/auth';
import { getWhatsAppSettings, updateWhatsAppSettings } from '../../../../lib/site-settings-store';

function isAdmin(request: Request): boolean {
  return getSessionFromRequest(request)?.role === 'admin';
}

export async function GET() {
  const whatsapp = await getWhatsAppSettings();
  return NextResponse.json({ whatsapp }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Partial<{
      phone: unknown;
      enabled: unknown;
      messageTemplate: unknown;
    }>;
    const phone = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
    const enabled = body.enabled === true;
    const messageTemplate = typeof body.messageTemplate === 'string'
      ? body.messageTemplate.trim()
      : '';

    if (phone && !/^\d{8,15}$/.test(phone)) {
      return NextResponse.json({ error: 'Укажите номер с кодом страны: от 8 до 15 цифр' }, { status: 400 });
    }
    if (enabled && !phone) {
      return NextResponse.json({ error: 'Для включения WhatsApp укажите номер магазина' }, { status: 400 });
    }
    if (!messageTemplate || messageTemplate.length > 5000) {
      return NextResponse.json({ error: 'Шаблон сообщения должен содержать от 1 до 5000 символов' }, { status: 400 });
    }

    const whatsapp = await updateWhatsAppSettings({ phone, enabled, messageTemplate });
    return NextResponse.json({ whatsapp });
  } catch {
    return NextResponse.json({ error: 'Не удалось сохранить настройки WhatsApp' }, { status: 500 });
  }
}
