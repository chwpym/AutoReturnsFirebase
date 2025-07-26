
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AppLayout } from '@/components/app-layout';
import { Toaster } from "@/components/ui/toaster";
import { Inter as FontSans } from "next/font/google"
import { cn } from "@/lib/utils"
import { BackupProvider } from '@/hooks/use-backup';

export const metadata: Metadata = {
  title: 'AutoReturns',
  description: 'Sistema de Controle de Garantia e Devolução para Auto Peças',
};

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        fontSans.variable
      )}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <BackupProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </BackupProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
