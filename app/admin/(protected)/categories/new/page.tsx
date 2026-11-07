import CategoryForm from '../../../../../components/admin/CategoryForm';
import { getAllStoredCategories } from '../../../../../lib/categories-store';

export default async function AdminNewCategoryPage() {
  const categories = await getAllStoredCategories();
  const nextSortOrder =
    categories.length > 0 ? Math.max(...categories.map((category) => category.sortOrder)) + 1 : 1;

  return <CategoryForm mode="create" nextSortOrder={nextSortOrder} />;
}
