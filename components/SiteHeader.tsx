'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import HeaderActions from './HeaderActions';

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="header">
      <div className="container header-inner">
        <Link className="logo" href="/">
          SYA <span>made to glow ✨</span>
        </Link>
        <nav className="header-nav">
          <Link href="/catalog">КАТАЛОГ</Link>
          <Link href="/catalog?sort=popular">БЕСТСЕЛЛЕРЫ</Link>
          <Link href="/#about">О БРЕНДЕ</Link>
          <Link href="/#contacts">КОНТАКТЫ</Link>
        </nav>
        <div className="header-actions-wrap">
          <HeaderActions />
          <button
            className="menu-toggle"
            type="button"
            aria-label="Меню"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Menu size={22} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav className="mobile-nav">
          <Link href="/catalog" onClick={() => setMenuOpen(false)}>
            КАТАЛОГ
          </Link>
          <Link href="/catalog?sort=popular" onClick={() => setMenuOpen(false)}>
            БЕСТСЕЛЛЕРЫ
          </Link>
          <Link href="/#about" onClick={() => setMenuOpen(false)}>
            О БРЕНДЕ
          </Link>
          <Link href="/#contacts" onClick={() => setMenuOpen(false)}>
            КОНТАКТЫ
          </Link>
        </nav>
      )}
    </header>
  );
}
