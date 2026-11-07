import { Suspense } from 'react';
import CheckoutSuccessClient from '../../../components/CheckoutSuccessClient';

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccessClient />
    </Suspense>
  );
}
