import { notFound } from 'next/navigation';
import ProductDetail from '../../../components/ProductDetail';
import { getProductById } from '../../../lib/products-store';

export const dynamic = 'force-dynamic';

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  return <ProductDetail product={product} />;
}
