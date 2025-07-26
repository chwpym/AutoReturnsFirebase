
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ArrowLeft, 
  ArrowRight,
  Car,
  LayoutDashboard,
  Users,
  Building,
  Wrench,
  Undo2,
  ShieldCheck,
  Search,
  DatabaseBackup,
  ChevronDown
} from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { cn } from '@/lib/utils';
import { QueryProvider } from './query-provider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const menuItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { 
    isGroup: true, 
    label: "Cadastros", 
    id: "cadastros",
    items: [
      { href: "/cadastros/clientes", label: "Clientes/Mecânicos", icon: Users },
      { href: "/cadastros/fornecedores", label: "Fornecedores", icon: Building },
      { href: "/cadastros/pecas", label: "Peças", icon: Wrench },
  ]},
  { 
    isGroup: true, 
    label: "Movimentações", 
    id: "movimentacoes",
    items: [
      { href: "/movimentacoes/devolucao", label: "Registrar Devolução", icon: Undo2 },
      { href: "/movimentacoes/garantia", label: "Registrar Garantia", icon: ShieldCheck },
  ]},
  { href: "/consultas", label: "Consultas e Relatórios", icon: Search },
  { href: "/backup", label: "Backup", icon: DatabaseBackup },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <QueryProvider>
        <div className={cn("app-container", isCollapsed && "menu-recolhido")}>
        <aside className="sidebar">
            <div className="sidebar-header">
            <div className="flex items-center gap-2">
                <Car className="h-8 w-8 text-primary" />
                <span className="sidebar-logo-text font-semibold tracking-tight text-lg">AutoReturns</span>
            </div>
            </div>

            <nav className="sidebar-nav">
              {menuItems.map((item, index) => (
                <div key={index} className="nav-group">
                  {item.isGroup ? (
                    <Collapsible defaultOpen={true}>
                      <CollapsibleTrigger asChild>
                         <button className="nav-group-trigger">
                          <span className="nav-group-label">{item.label}</span>
                          <ChevronDown className="nav-group-chevron" />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="nav-group-content">
                            {item.items?.map(subItem => (
                                <Link href={subItem.href} key={subItem.href} className={cn("nav-item", pathname === subItem.href && "active")}>
                                    <subItem.icon className="nav-item-icon" />
                                    <span className="nav-item-text">{subItem.label}</span>
                                </Link>
                            ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <Link href={item.href || '#'} key={`${item.href}-${item.label}`} className={cn("nav-item", pathname === item.href && "active")}>
                        <item.icon className="nav-item-icon" />
                        <span className="nav-item-text">{item.label}</span>
                    </Link>
                  )}
                </div>
              ))}
            </nav>
            
        </aside>
        <main className="main-content">
            <header className="main-header flex items-center justify-between">
              <button onClick={toggleSidebar} className="sidebar-toggle-button">
                  {isCollapsed ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
              </button>
              <ThemeToggle />
            </header>
            <div className="content-area">
            {children}
            </div>
        </main>
        </div>
    </QueryProvider>
  );
}
