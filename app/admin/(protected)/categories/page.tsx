import { getAllStoredCategories } from '../../../../lib/categories-store';
import { getAllStoredProducts } from '../../../../lib/products-store';
import AdminCategoriesClient from './AdminCategoriesClient';

export default async function AdminCategoriesPage() {
  const [categories, products] = await Promise.all([
    getAllStoredCategories(),
    getAllStoredProducts(),
  ]);

  const productCounts = products.reduce<Record<string, number>>((counts, product) => {
    counts[product.category] = (counts[product.category] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <AdminCategoriesClient initialCategories={categories} productCounts={productCounts} />
  );
}
