import { getCategoryFromList, type Product, type Category } from './products';

function productSearchText(product: Product, categories: Category[]): string {
  const category = getCategoryFromList(categories, product.category);
  return [
    product.name,
    product.id,
    category?.title ?? '',
    product.description ?? '',
    product.material ?? '',
    product.color ?? '',
    product.size ?? '',
  ]
    .join(' ')
    .toLowerCase();
}

export function searchProducts(
  query: string,
  products: Product[],
  categories: Category[] = [],
): Product[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return products.filter((product) =>
    productSearchText(product, categories).includes(normalized),
  );
}
