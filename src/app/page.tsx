
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Package, ShieldCheck, History, Users, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getCountFromServer, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  colorClass: string;
  loading: boolean;
}

function StatCard({ title, value, icon: Icon, colorClass, loading }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${colorClass}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
            <Skeleton className="h-8 w-1/2" />
        ) : (
            <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

interface QuickAccessCardProps {
  title: string;
  href: string;
  icon: LucideIcon;
}

function QuickAccessCard({ title, href, icon: Icon }: QuickAccessCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <Link href={href} className="block h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-4 text-lg">
            <div className="bg-primary/10 p-3 rounded-md">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
            <Button variant="link" className="p-0">
              Acessar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </CardContent>
      </Link>
    </Card>
  )
}

// Query Functions
const fetchDevolucoesMes = async () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    // Query for all returns and filter by date on the client side to avoid composite index requirement.
    const q = query(
        collection(db, 'movimentacoes'),
        where('tipoMovimentacao', '==', 'Devolução'),
    );

    const querySnapshot = await getDocs(q);
    
    let count = 0;
    querySnapshot.forEach(doc => {
        const data = doc.data();
        const dataMovimentacao = data.dataMovimentacao.toDate();
        if (dataMovimentacao >= startOfMonth && dataMovimentacao <= endOfMonth) {
            count++;
        }
    });
    
    return count;
};

const fetchGarantiasPendentes = async () => {
    const q = query(
        collection(db, 'movimentacoes'),
        where('tipoMovimentacao', '==', 'Garantia'),
        where('acaoRetorno', '==', 'Pendente')
    );
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
};

const fetchClientesAtivos = async () => {
    const q = query(collection(db, 'clientes'), where('status', '==', 'Ativo'));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
};

const fetchPecasAtivas = async () => {
    const q = query(collection(db, 'pecas'), where('status', '==', 'Ativo'));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
};


export default function DashboardPage() {
    const { toast } = useToast();

    const { data: devolucoesMes, isLoading: isLoadingDevolucoes, isError: isErrorDevolucoes } = useQuery({
        queryKey: ['dashboardDevolucoesMes'],
        queryFn: fetchDevolucoesMes,
    });

    const { data: garantiasPendentes, isLoading: isLoadingGarantias, isError: isErrorGarantias } = useQuery({
        queryKey: ['dashboardGarantiasPendentes'],
        queryFn: fetchGarantiasPendentes,
    });

    const { data: clientesAtivos, isLoading: isLoadingClientes, isError: isErrorClientes } = useQuery({
        queryKey: ['dashboardClientesAtivos'],
        queryFn: fetchClientesAtivos,
    });

    const { data: pecasAtivas, isLoading: isLoadingPecas, isError: isErrorPecas } = useQuery({
        queryKey: ['dashboardPecasAtivas'],
        queryFn: fetchPecasAtivas,
    });
    
    React.useEffect(() => {
        if(isErrorDevolucoes || isErrorGarantias || isErrorClientes || isErrorPecas) {
            toast({
                title: 'Erro ao carregar dashboard',
                description: 'Não foi possível buscar os indicadores.',
                variant: 'destructive',
            });
        }
    }, [isErrorDevolucoes, isErrorGarantias, isErrorClientes, isErrorPecas, toast]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu sistema.</p>
      </div>
      
      <section>
        <h2 className="text-xl font-semibold tracking-tight mb-4">Indicadores</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Devoluções no Mês" 
            value={devolucoesMes ?? 0} 
            icon={Package} 
            colorClass="text-accent" 
            loading={isLoadingDevolucoes}
          />
          <StatCard 
            title="Garantias Pendentes" 
            value={garantiasPendentes ?? 0} 
            icon={ShieldCheck} 
            colorClass="text-warning"
            loading={isLoadingGarantias} 
          />
          <StatCard 
            title="Clientes Ativos" 
            value={clientesAtivos ?? 0}
            icon={Users} 
            colorClass="text-info" 
            loading={isLoadingClientes}
          />
          <StatCard 
            title="Peças Ativas" 
            value={pecasAtivas ?? 0} 
            icon={Wrench} 
            colorClass="text-primary" 
            loading={isLoadingPecas}
          />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight mb-4">Acesso Rápido</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <QuickAccessCard title="Registrar Devolução" href="/movimentacoes/devolucao" icon={Package} />
          <QuickAccessCard title="Registrar Garantia" href="/movimentacoes/garantia" icon={ShieldCheck} />
          <QuickAccessCard title="Consultar Histórico" href="/consultas" icon={History} />
        </div>
      </section>
    </div>
  );
}
