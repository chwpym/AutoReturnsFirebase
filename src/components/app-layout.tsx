
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
  FileText
} from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { cn } from '@/lib/utils';

const menuItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { isGroup: true, label: "Cadastros", items: [
      { href: "/cadastros/clientes", label: "Clientes/Mecânicos", icon: Users },
      { href: "/cadastros/fornecedores", label: "Fornecedores", icon: Building },
      { href: "/cadastros/pecas", label: "Peças", icon: Wrench },
  ]},
  { isGroup: true, label: "Movimentações", items: [
      { href: "/movimentacoes/devolucao", label: "Registrar Devolução", icon: Undo2 },
      { href: "/movimentacoes/garantia", label: "Registrar Garantia", icon: ShieldCheck },
  ]},
  { href: "/consultas", label: "Consultas", icon: Search },
  { href: "/relatorios", label: "Relatórios", icon: FileText },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
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
                <>
                  <span className="nav-group-label">{item.label}</span>
                  {item.items?.map(subItem => (
                     <Link href={subItem.href} key={subItem.href} className={cn("nav-item", pathname === subItem.href && "active")}>
                        <subItem.icon className="nav-item-icon" />
                        <span className="nav-item-text">{subItem.label}</span>
                    </Link>
                  ))}
                </>
              ) : (
                 <Link href={item.href || '#'} className={cn("nav-item", pathname === item.href && "active")}>
                    <item.icon className="nav-item-icon" />
                    <span className="nav-item-text">{item.label}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>
        
        <div className="sidebar-footer">
            <ThemeToggle />
        </div>

      </aside>
      <main className="main-content">
        <header className="main-header">
          <button onClick={toggleSidebar} className="sidebar-toggle-button">
            {isCollapsed ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
          </button>
        </header>
        <div className="content-area">
          {children}
        </div>
      </main>
    </div>
  );
}
