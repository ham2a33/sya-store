import type { CategorySlug } from './products.types';

export type { CategorySlug };

export type Product = {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  category: CategorySlug;
  image: string;
  images: string[];
  description: string;
  material?: string;
  color?: string;
  size?: string;
  stock: number;
  inStock: boolean;
  isNew?: boolean;
  popular?: boolean;
  isBestseller?: boolean;
  bestsellerOrder?: number | null;
  status?: 'active' | 'archived';
};

export type Category = {
  slug: CategorySlug;
  title: string;
  description: string;
  image?: string;
  sortOrder?: number;
  active?: boolean;
  status?: 'active' | 'archived';
  slugAliases?: string[];
};

export function formatPrice(price: number): string {
  return `${price.toLocaleString('ru-RU')} ₸`;
}

export function getCategoryFromList(
  categories: Category[],
  slug: string,
): Category | undefined {
  return categories.find((category) => category.slug === slug);
}

export function getCategoryPathFromList(categories: Category[], title: string): string {
  const category = categories.find((item) => item.title === title);
  if (category) return `/catalog/${category.slug}`;
  if (title === 'Колье') return '/catalog/chokers';
  return '/catalog';
}

export function getSimilarProductsFromList(
  products: Product[],
  product: Product,
  limit = 4,
): Product[] {
  return products
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, limit);
}

export function pluralizeProducts(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} товар`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    return `${count} товара`;
  return `${count} товаров`;
}

export function getBestsellerProducts(products: Product[]): Product[] {
  return products
    .filter((product) => product.isBestseller && product.status !== 'archived')
    .sort((a, b) => (a.bestsellerOrder ?? 999) - (b.bestsellerOrder ?? 999));
}

export function getNewCollectionProducts(products: Product[], limit = 6): Product[] {
  return products
    .filter((product) => product.isNew && product.status !== 'archived')
    .slice(0, limit);
}
