'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  { href: '/admin/products', label: 'Товары' },
  { href: '/admin/categories', label: 'Категории' },
  { href: '/admin/orders', label: 'Заказы' },
  { href: '/admin/homepage', label: 'Главная' },
  { href: '/admin/settings/whatsapp', label: 'Настройки' },
  { href: '/admin/security', label: 'Безопасность' },
  { href: '/admin/media', label: 'Медиа' },
];

export default function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link href="/admin/products" className="admin-sidebar-logo">
          SYA <span>admin</span>
        </Link>
        <nav className="admin-sidebar-nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-sidebar-link${
                pathname.startsWith(item.href) ? ' admin-sidebar-link--active' : ''
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <Link href="/" target="_blank" className="admin-sidebar-link">
            Открыть на сайте
          </Link>
          <button type="button" className="admin-sidebar-link admin-sidebar-button" onClick={logout}>
            Выйти
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <div className="admin-page-head">
          <div>
            <p className="admin-eyebrow">ADMIN</p>
            <h1>{title}</h1>
            {subtitle && <p className="admin-subtitle">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {children}
      </div>
    </div>
  );
}
