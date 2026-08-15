import { notFound } from 'next/navigation';
import ProductDetail from '../../../components/ProductDetail';
import { getAllProducts, getProductById } from '../../../lib/products-store';

export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((product) => ({ id: product.id }));
}

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
