
'use client';

import * as React from 'react';
import { collection, getDocs, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, Loader2, DatabaseBackup, AlertTriangle, FileCsv } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Papa from 'papaparse';
import { format } from 'date-fns';

const COLLECTIONS_TO_BACKUP = ['clientes', 'fornecedores', 'pecas', 'movimentacoes'];

// Helper to download JSON
const downloadJSON = (data: any, filename: string) => {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(data, (key, value) => {
      // Convert Timestamps to a serializable format
      if (value && value.toDate instanceof Function) {
        return { _seconds: value.seconds, _nanoseconds: value.nanoseconds, __datatype__: 'timestamp' };
      }
      return value;
    }, 2)
  )}`;
  const link = document.createElement('a');
  link.setAttribute('href', jsonString);
  link.setAttribute('download', `${filename}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Helper to download CSV
const downloadCSV = (csv: string, filename: string) => {
    const bom = "\uFEFF"; // Byte Order Mark for UTF-8
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


export default function BackupPage() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [isExportingCsv, setIsExportingCsv] = React.useState<string | null>(null);

  const handleExportJson = async () => {
    setIsExporting(true);
    try {
      const backupData: Record<string, any[]> = {};

      for (const collectionName of COLLECTIONS_TO_BACKUP) {
        const querySnapshot = await getDocs(collection(db, collectionName));
        backupData[collectionName] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
      }

      downloadJSON(backupData, `backup_completo_${new Date().toISOString().split('T')[0]}`);

      toast({
        title: 'Exportação Concluída',
        description: `Backup de todas as coleções gerado com sucesso.`,
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: 'Erro na Exportação',
        description: 'Não foi possível exportar os dados do sistema.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportJson = async () => {
    if (!importFile) {
      toast({ title: 'Nenhum arquivo selecionado', variant: 'destructive' });
      return;
    }

    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupText = event.target?.result as string;
        const backupData = JSON.parse(backupText, (key, value) => {
          // Re-hydrate Timestamps from the serializable format
          if (value && value.__datatype__ === 'timestamp' && value._seconds !== undefined) {
            return new Timestamp(value._seconds, value._nanoseconds);
          }
          return value;
        });

        const batch = writeBatch(db);
        let operationsCount = 0;

        for (const collectionName in backupData) {
          if (Object.prototype.hasOwnProperty.call(backupData, collectionName)) {
            const records = backupData[collectionName];
            if (Array.isArray(records)) {
              records.forEach((record: any) => {
                const { id, ...data } = record;
                if (id) {
                  const docRef = doc(db, collectionName, id);
                  batch.set(docRef, data);
                  operationsCount++;
                }
              });
            }
          }
        }

        if (operationsCount === 0) {
          toast({
            title: 'Nenhum dado para importar',
            description: 'O arquivo de backup parece estar vazio ou em um formato inválido.',
            variant: 'destructive',
          });
          setIsImporting(false);
          return;
        }

        await batch.commit();

        toast({
          title: 'Importação Concluída',
          description: `${operationsCount} registros foram restaurados com sucesso.`,
        });

      } catch (error) {
        console.error('Error importing data:', error);
        toast({
          title: 'Erro na Importação',
          description: 'O arquivo está corrompido ou em formato inválido. A restauração falhou.',
          variant: 'destructive',
        });
      } finally {
        setIsImporting(false);
        setImportFile(null);
        // Reset the input field
        const fileInput = document.getElementById('import-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    };
    reader.readAsText(importFile);
  };
  
  const handleExportCsv = async (collectionName: string) => {
    setIsExportingCsv(collectionName);
    try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        const data = querySnapshot.docs.map(doc => {
            const docData = doc.data();
            const flattenedData: Record<string, any> = { id: doc.id };

            for (const key in docData) {
                const value = docData[key];
                if (value instanceof Timestamp) {
                    flattenedData[key] = format(value.toDate(), 'yyyy-MM-dd HH:mm:ss');
                } else if (typeof value === 'object' && value !== null) {
                    // Flatten nested objects (like 'tipo' in 'clientes')
                    for (const subKey in value) {
                         flattenedData[`${key}.${subKey}`] = value[subKey];
                    }
                } else {
                    flattenedData[key] = value;
                }
            }
            return flattenedData;
        });

        if (data.length === 0) {
            toast({ title: 'Nenhum dado para exportar', description: `A coleção "${collectionName}" está vazia.` });
            return;
        }

        const csv = Papa.unparse(data);
        downloadCSV(csv, `export_${collectionName}_${new Date().toISOString().split('T')[0]}`);
        
        toast({ title: 'Exportação Concluída', description: `Dados de "${collectionName}" exportados com sucesso.` });

    } catch (error) {
        console.error(`Error exporting ${collectionName} to CSV:`, error);
        toast({ title: 'Erro na Exportação', description: `Não foi possível exportar a coleção "${collectionName}".`, variant: 'destructive' });
    } finally {
        setIsExportingCsv(null);
    }
  };


  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <DatabaseBackup className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Backup e Restauração de Dados
          </h1>
          <p className="text-muted-foreground">
            Gerencie cópias de segurança de todo o sistema.
          </p>
        </div>
      </div>

      <Tabs defaultValue="json_backup">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="json_backup">Backup & Restore (JSON)</TabsTrigger>
          <TabsTrigger value="csv_export">Exportação (CSV)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="json_backup" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Backup Completo (Exportação)</CardTitle>
              <CardDescription>
                Crie um único arquivo JSON contendo todos os dados do sistema (clientes, fornecedores, peças e movimentações). Guarde este arquivo em um local seguro.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleExportJson}
                disabled={isExporting}
                size="lg"
              >
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Exportar Backup Completo (.json)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Restauração Completa (Importação)</CardTitle>
              <CardDescription>
                Use um arquivo de backup JSON para restaurar os dados do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                  <h3 className="font-bold text-destructive">Atenção: Ação Irreversível</h3>
                </div>
                <p className="text-sm text-destructive/90 mt-2">
                  A importação de um backup irá **sobrescrever** todos os dados existentes que possuam o mesmo ID dos registros no arquivo. Novos registros serão adicionados. Esta ação não pode ser desfeita.
                  Certifique-se de que o arquivo selecionado é o backup correto que deseja restaurar.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="import-file-input">Selecione o arquivo de backup (.json)</Label>
                  <Input
                    id="import-file-input"
                    type="file"
                    accept=".json"
                    onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
                  />
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={!importFile || isImporting}>
                      {isImporting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Importar e Restaurar Dados
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá restaurar os dados do arquivo de backup. Dados existentes com o mesmo ID serão sobrescritos.
                        <br /><br />
                        Arquivo selecionado: <span className="font-semibold">{importFile?.name}</span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleImportJson} className="bg-destructive hover:bg-destructive/90">
                        Sim, restaurar o backup
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="csv_export" className="pt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Exportar Dados para CSV</CardTitle>
                    <CardDescription>
                        Faça o download dos dados de uma coleção específica em formato CSV. Este formato é ideal para visualização e edição em planilhas como o Excel.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {COLLECTIONS_TO_BACKUP.map((collectionName) => (
                         <Button
                            key={collectionName}
                            onClick={() => handleExportCsv(collectionName)}
                            disabled={!!isExportingCsv}
                            variant="outline"
                         >
                            {isExportingCsv === collectionName ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <FileCsv className="mr-2 h-4 w-4" />
                            )}
                            Exportar {collectionName.charAt(0).toUpperCase() + collectionName.slice(1)}
                        </Button>
                    ))}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
