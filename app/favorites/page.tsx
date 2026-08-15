import { Suspense } from 'react';
import CatalogView from '../../components/CatalogView';

export default function FavoritesPage() {
  return (
    <Suspense fallback={null}>
      <CatalogView mode="favorites" />
    </Suspense>
  );
}
