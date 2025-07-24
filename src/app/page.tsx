import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Package, PackagePlus, ShieldCheck, History, Users, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  colorClass: string;
}

function StatCard({ title, value, icon: Icon, colorClass }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${colorClass}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
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
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu sistema.</p>
      </div>
      
      <section>
        <h2 className="text-xl font-semibold tracking-tight mb-4">Indicadores</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Devoluções no Mês" value="12" icon={Package} colorClass="text-success-600" />
          <StatCard title="Garantias Pendentes" value="3" icon={ShieldCheck} colorClass="text-warning-500" />
          <StatCard title="Clientes Ativos" value="124" icon={Users} colorClass="text-info-500" />
          <StatCard title="Peças Distintas" value="842" icon={Wrench} colorClass="text-primary" />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight mb-4">Acesso Rápido</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <QuickAccessCard title="Registrar Devolução" href="/movimentacoes/devolucao" icon={PackagePlus} />
          <QuickAccessCard title="Registrar Garantia" href="/movimentacoes/garantia" icon={ShieldCheck} />
          <QuickAccessCard title="Consultar Histórico" href="/consultas" icon={History} />
        </div>
      </section>
    </div>
  );
}
