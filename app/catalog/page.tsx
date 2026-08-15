import { Suspense } from 'react';
import CatalogView from '../../components/CatalogView';

export default function CatalogPage() {
  return (
    <Suspense fallback={null}>
      <CatalogView />
    </Suspense>
  );
}
