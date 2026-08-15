import { getAllProductsAdmin } from '../../../../lib/products-store';
import AdminHomepageClient from './AdminHomepageClient';

export default async function AdminHomepagePage() {
  const products = await getAllProductsAdmin();
  return <AdminHomepageClient products={products} />;
}
