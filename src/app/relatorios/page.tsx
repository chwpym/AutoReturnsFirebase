
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RelatoriosRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new unified consultations/reports page
    router.replace('/consultas');
  }, [router]);

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Redirecionando...</h1>
      <p className="text-muted-foreground">A página de relatórios foi integrada à página de consultas.</p>
    </div>
  );
}
