import type { CategorySlug } from './products.types';

export type ProductStatus = 'active' | 'archived';
export type UserRole = 'user' | 'admin';

export type StoredProduct = {
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
  isNew?: boolean;
  popular?: boolean;
  isBestseller?: boolean;
  bestsellerOrder?: number | null;
  status: ProductStatus;
};

export type CategoryStatus = 'active' | 'archived';

export type StoredCategory = {
  slug: CategorySlug;
  title: string;
  description: string;
  image: string;
  sortOrder: number;
  active: boolean;
  status?: CategoryStatus;
  slugAliases?: string[];
};

export type HeroSlide = {
  id: string;
  name?: string;
  eyebrow?: string;
  headline?: string;
  title?: string;
  subtitle?: string;
  cta: string;
  href: string;
  image: string;
  sortOrder: number;
  active: boolean;
};

export type HomepageConfig = {
  heroSlides: HeroSlide[];
  newCollectionTitle: string;
  bestsellersTitle: string;
  aboutImage: string;
};

export type MediaItem = {
  id: string;
  url: string;
  filename: string;
  uploadedAt: string;
  label?: string;
};

export type MediaUsage = {
  type: 'product' | 'category' | 'homepage' | 'hero';
  id: string;
  label: string;
};

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
};

export type SessionPayload = {
  userId: string;
  email: string;
  role: UserRole;
  exp: number;
};

export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'completed'
  | 'cancelled';

export type OrderItem = {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  total: number;
};

export type OrderCustomer = {
  name: string;
  phone: string;
  email?: string;
};

export type OrderDelivery = {
  method: 'delivery' | 'pickup';
  city?: string;
  address?: string;
};

export type StoredOrder = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  customer: OrderCustomer;
  delivery: OrderDelivery;
  comment?: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  createdAt: string;
};

export type CreateOrderInput = {
  customer: OrderCustomer;
  delivery: OrderDelivery;
  comment?: string;
  items: { productId: string; quantity: number }[];
};
