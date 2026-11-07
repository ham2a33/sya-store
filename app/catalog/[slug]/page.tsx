import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import CatalogView from '../../../components/CatalogView';
import { getAllCategories, resolveCategorySlug } from '../../../lib/categories-store';

export async function generateStaticParams() {
  const categories = await getAllCategories(true);
  return categories.map((category) => ({ slug: category.slug }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = await resolveCategorySlug(slug);

  if (!resolved) {
    notFound();
  }

  if (resolved.isAlias) {
    redirect(`/catalog/${resolved.category.slug}`);
  }

  if (!resolved.category.active || resolved.category.status === 'archived') {
    notFound();
  }

  return (
    <Suspense fallback={null}>
      <CatalogView categorySlug={resolved.category.slug} />
    </Suspense>
  );
}
