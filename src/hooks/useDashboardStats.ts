
'use client';

import * as React from 'react';
import { collection, query, where, getCountFromServer, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from './use-toast';

interface DashboardStats {
  devolucoesMes: number;
  garantiasPendentes: number;
  clientesAtivos: number;
  pecasAtivas: number;
}

export function useDashboardStats() {
  const { toast } = useToast();
  const [stats, setStats] = React.useState<DashboardStats>({
    devolucoesMes: 0,
    garantiasPendentes: 0,
    clientesAtivos: 0,
    pecasAtivas: 0,
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        // Devoluções no Mês
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
        const devolucoesQuery = query(
          collection(db, 'movimentacoes'),
          where('tipoMovimentacao', '==', 'Devolução'),
          where('dataMovimentacao', '>=', Timestamp.fromDate(startOfMonth)),
          where('dataMovimentacao', '<=', Timestamp.fromDate(endOfMonth))
        );
        const devolucoesSnapshot = await getCountFromServer(devolucoesQuery);

        // Garantias Pendentes
        const garantiasQuery = query(
          collection(db, 'movimentacoes'),
          where('tipoMovimentacao', '==', 'Garantia'),
          where('acaoRetorno', '==', 'Pendente')
        );
        const garantiasSnapshot = await getCountFromServer(garantiasQuery);
        
        // Clientes Ativos
        const clientesQuery = query(collection(db, 'clientes'), where('status', '==', 'Ativo'));
        const clientesSnapshot = await getCountFromServer(clientesQuery);

        // Peças Ativas
        const pecasQuery = query(collection(db, 'pecas'), where('status', '==', 'Ativo'));
        const pecasSnapshot = await getCountFromServer(pecasQuery);

        setStats({
          devolucoesMes: devolucoesSnapshot.data().count,
          garantiasPendentes: garantiasSnapshot.data().count,
          clientesAtivos: clientesSnapshot.data().count,
          pecasAtivas: pecasSnapshot.data().count,
        });

      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        toast({
          title: 'Erro ao carregar dashboard',
          description: 'Não foi possível buscar os indicadores.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();

    // Set up listeners for real-time updates
    const collectionsToWatch = ['movimentacoes', 'clientes', 'pecas'];
    const unsubscribes = collectionsToWatch.map(col => onSnapshot(collection(db, col), fetchStats));

    // Cleanup listeners on unmount
    return () => unsubscribes.forEach(unsub => unsub());
    
  }, [toast]);

  return { stats, loading };
}
