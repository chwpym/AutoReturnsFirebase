"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Building, 
  Car, 
  ChevronDown, 
  FileText, 
  LayoutDashboard, 
  LogOut, 
  Package, 
  Search, 
  Settings, 
  ShieldCheck, 
  Undo2, 
  Users, 
  Wrench 
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./theme-toggle"

const menuItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Cadastros",
    isGroup: true,
    items: [
      { href: "/cadastros/clientes", label: "Clientes/Mecânicos", icon: Users },
      { href: "/cadastros/fornecedores", label: "Fornecedores", icon: Building },
      { href: "/cadastros/pecas", label: "Peças", icon: Wrench },
    ],
  },
  {
    label: "Movimentações",
    isGroup: true,
    items: [
      { href: "/movimentacoes/devolucao", label: "Registrar Devolução", icon: Undo2 },
      { href: "/movimentacoes/garantia", label: "Registrar Garantia", icon: ShieldCheck },
    ],
  },
  { href: "/consultas", label: "Consultas", icon: Search },
  { href: "/relatorios", label: "Relatórios", icon: FileText },
]

function AppSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    return pathname === href
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 bg-primary/10 hover:bg-primary/20">
                <Car className="h-6 w-6 text-primary" />
            </Button>
            <div className="flex flex-col">
                <span className="font-semibold tracking-tight text-lg">AutoReturns</span>
            </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {menuItems.map((item) => (
          item.isGroup ? (
            <SidebarGroup key={item.label}>
              <SidebarGroupLabel>{item.label}</SidebarGroupLabel>
              <SidebarMenu>
                {item.items?.map((subItem) => (
                  <SidebarMenuItem key={subItem.href}>
                    <Link href={subItem.href} className="w-full">
                      <SidebarMenuButton isActive={isActive(subItem.href)} tooltip={subItem.label}>
                        <subItem.icon />
                        <span>{subItem.label}</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ) : (
            <SidebarGroup key={item.label}>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Link href={item.href || '#'} className="w-full">
                    <SidebarMenuButton isActive={isActive(item.href || '#')} tooltip={item.label}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          )
        ))}
      </SidebarContent>

      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 p-2 h-auto">
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://placehold.co/40x40.png" alt="User" data-ai-hint="user avatar" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start truncate">
                <span className="font-medium text-sm">Usuário</span>
                <span className="text-xs text-muted-foreground">admin@email.com</span>
              </div>
              <ChevronDown className="ml-auto h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

function AppHeader() {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
       <SidebarTrigger className="md:hidden" />
       <div className="w-full flex-1">
        {/* Breadcrumb can go here */}
       </div>
       <ThemeToggle />
    </header>
  )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <AppHeader />
        <main className="flex-1 p-4 lg:p-6 bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
