
'use client';

import * as React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface BackupContextType {
  lastBackup: Date | null;
  updateLastBackup: () => void;
}

const BackupContext = createContext<BackupContextType | undefined>(undefined);

export function BackupProvider({ children }: { children: React.ReactNode }) {
  const [lastBackup, setLastBackup] = useState<Date | null>(() => {
    if (typeof window === 'undefined') return null;
    const savedDate = localStorage.getItem('lastBackupDate');
    return savedDate ? new Date(savedDate) : null;
  });

  const updateLastBackup = useCallback(() => {
    const now = new Date();
    setLastBackup(now);
    localStorage.setItem('lastBackupDate', now.toISOString());
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const oneDay = 24 * 60 * 60 * 1000;
      if (lastBackup && new Date().getTime() - lastBackup.getTime() > oneDay) {
        event.preventDefault();
        // Standard for most browsers
        event.returnValue = '';
        return 'Seu último backup foi há mais de 24 horas. Deseja continuar e sair?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [lastBackup]);

  return (
    <BackupContext.Provider value={{ lastBackup, updateLastBackup }}>
      {children}
    </BackupContext.Provider>
  );
}

export function useBackup() {
  const context = useContext(BackupContext);
  if (context === undefined) {
    throw new Error('useBackup must be used within a BackupProvider');
  }
  return context;
}
