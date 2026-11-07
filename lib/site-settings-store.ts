import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { DEFAULT_WHATSAPP_TEMPLATE } from './whatsapp-order';

export type WhatsAppSettings = {
  phone: string;
  enabled: boolean;
  messageTemplate: string;
};

type SiteSettings = {
  whatsapp?: Partial<WhatsAppSettings>;
  [key: string]: unknown;
};

const SETTINGS_PATH = path.join(process.cwd(), 'data/site-settings.json');
const DEFAULT_WHATSAPP_SETTINGS: WhatsAppSettings = {
  phone: '',
  enabled: false,
  messageTemplate: DEFAULT_WHATSAPP_TEMPLATE,
};

async function readSettings(): Promise<SiteSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as SiteSettings)
      : {};
  } catch {
    return {};
  }
}

export async function getWhatsAppSettings(): Promise<WhatsAppSettings> {
  const settings = await readSettings();
  const whatsapp = settings.whatsapp ?? {};
  return {
    phone: typeof whatsapp.phone === 'string' ? whatsapp.phone : DEFAULT_WHATSAPP_SETTINGS.phone,
    enabled: typeof whatsapp.enabled === 'boolean' ? whatsapp.enabled : DEFAULT_WHATSAPP_SETTINGS.enabled,
    messageTemplate:
      typeof whatsapp.messageTemplate === 'string' && whatsapp.messageTemplate.trim()
        ? whatsapp.messageTemplate
        : DEFAULT_WHATSAPP_SETTINGS.messageTemplate,
  };
}

export async function updateWhatsAppSettings(
  whatsapp: WhatsAppSettings,
): Promise<WhatsAppSettings> {
  const settings = await readSettings();
  const next = { ...settings, whatsapp };
  const directory = path.dirname(SETTINGS_PATH);
  await fs.mkdir(directory, { recursive: true });
  const temporaryPath = `${SETTINGS_PATH}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(next, null, 2), { encoding: 'utf8', mode: 0o600 });
  await fs.rename(temporaryPath, SETTINGS_PATH);
  return whatsapp;
}
