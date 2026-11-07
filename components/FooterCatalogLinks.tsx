'use client';

import Link from 'next/link';
import { useActiveCategories } from '../context/StorefrontContext';

export default function FooterCatalogLinks() {
  const categories = useActiveCategories();

  return (
    <>
      {categories.map((category) => (
        <Link key={category.slug} href={`/catalog/${category.slug}`}>
          {category.title}
        </Link>
      ))}
    </>
  );
}
