import type { Metadata } from 'next';
import { Cormorant_Garamond, Jost } from 'next/font/google';
import { CartProvider } from '../context/CartContext';
import { FavoritesProvider } from '../context/FavoritesContext';
import { ProductsProvider } from '../context/ProductsContext';
import { StorefrontProvider } from '../context/StorefrontContext';
import { getAllStoredCategories } from '../lib/categories-store';
import { getHomepageConfig } from '../lib/homepage-store';
import { getAllProducts } from '../lib/products-store';
import './globals.css';

const serif = Cormorant_Garamond({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  variable: '--font-serif',
});

const sans = Jost({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'SYA — made to glow',
  description: 'SYA jewelry store',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [products, categories, homepage] = await Promise.all([
    getAllProducts(),
    getAllStoredCategories(),
    getHomepageConfig(),
  ]);

  return (
    <html lang="ru" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <StorefrontProvider categories={categories} homepage={homepage}>
          <ProductsProvider initialProducts={products}>
            <CartProvider>
              <FavoritesProvider>{children}</FavoritesProvider>
            </CartProvider>
          </ProductsProvider>
        </StorefrontProvider>
      </body>
    </html>
  );
}
