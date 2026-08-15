'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

type SearchOverlayProps = {
  open: boolean;
  onClose: () => void;
};

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!open) return;

    if (typeof window !== 'undefined' && window.location.pathname === '/search') {
      const params = new URLSearchParams(window.location.search);
      setValue(params.get('q') ?? '');
    } else {
      setValue('');
    }

    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const submit = () => {
    router.push(`/search?q=${encodeURIComponent(value.trim())}`);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-panel" onClick={(event) => event.stopPropagation()}>
        <Search size={20} strokeWidth={1.5} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Название, категория или артикул"
          aria-label="Поиск товаров"
        />
        <button type="button" aria-label="Закрыть поиск" onClick={onClose}>
          <X size={20} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
