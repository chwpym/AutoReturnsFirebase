
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
import { ArrowRight, Package, ShieldCheck, History, Users, Wrench, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';


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

export default function DashboardPage() {
    const { stats, loading } = useDashboardStats();

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
            value={stats.devolucoesMes} 
            icon={Package} 
            colorClass="text-accent" 
            loading={loading}
          />
          <StatCard 
            title="Garantias Pendentes" 
            value={stats.garantiasPendentes} 
            icon={ShieldCheck} 
            colorClass="text-warning"
            loading={loading} 
          />
          <StatCard 
            title="Clientes Ativos" 
            value={stats.clientesAtivos} 
            icon={Users} 
            colorClass="text-info" 
            loading={loading}
          />
          <StatCard 
            title="Peças Ativas" 
            value={stats.pecasAtivas} 
            icon={Wrench} 
            colorClass="text-primary" 
            loading={loading}
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
