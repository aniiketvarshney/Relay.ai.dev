import { Suspense } from 'react';
import RegistryPage from './RegistryPageClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="grid grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-40" />)}</div>}>
      <RegistryPage />
    </Suspense>
  );
}
