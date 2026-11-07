import { notFound } from 'next/navigation';
import CategoryForm from '../../../../../../components/admin/CategoryForm';
import { getCategoryBySlug } from '../../../../../../lib/categories-store';

export default async function AdminEditCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  return <CategoryForm mode="edit" initialCategory={category} />;
}
