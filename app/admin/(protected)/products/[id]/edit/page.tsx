import { notFound } from 'next/navigation';
import ProductForm from '../../../../../../components/admin/ProductForm';
import { getStoredProduct } from '../../../../../../lib/products-store';

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getStoredProduct(id);

  if (!product) {
    notFound();
  }

  return (
    <ProductForm
      mode="edit"
      initialProduct={{
        ...product,
        inStock: product.stock > 0 && product.status === 'active',
      }}
    />
  );
}
