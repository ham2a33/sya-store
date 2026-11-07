import { Suspense } from 'react';
import CatalogView from '../../components/CatalogView';

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <CatalogView mode="search" />
    </Suspense>
  );
}
