import { getCurrentUser } from '../../../../lib/auth';
import { getAllStoredProducts } from '../../../../lib/products-store';
import AdminProductsPageClient from './AdminProductsPageClient';

export default async function AdminProductsPage() {
  const [products, user] = await Promise.all([getAllStoredProducts(), getCurrentUser()]);

  const normalized = products.map((product) => ({
    ...product,
    inStock: product.stock > 0 && product.status === 'active',
  }));

  return (
    <AdminProductsPageClient
      products={normalized}
      adminEmail={user?.email ?? 'admin'}
    />
  );
}
