
'use client';

import * as React from 'react';
import { collection, getDocs, writeBatch, doc, Timestamp, addDoc } from 'firebase/firestore';
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
import { Download, Upload, Loader2, DatabaseBackup, AlertTriangle, FileText, FileArchive, FileJson } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Papa from 'papaparse';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { useBackup } from '@/hooks/use-backup';


const COLLECTIONS_TO_BACKUP = ['clientes', 'fornecedores', 'pecas', 'movimentacoes'];
const COLLECTIONS_TO_IMPORT_CSV = ['clientes', 'fornecedores', 'pecas'];

// Helper to download files
const downloadFile = (content: string, filename: string, mimeType: string) => {
    const bom = mimeType === 'text/csv;charset=utf-8;' ? "\uFEFF" : "";
    const blob = new Blob([bom + content], { type: mimeType });
    saveAs(blob, filename);
};


const flattenData = (docData: any) => {
    const flattenedData: Record<string, any> = {};
    for (const key in docData) {
        const value = docData[key];
        if (value instanceof Timestamp) {
            flattenedData[key] = format(value.toDate(), 'yyyy-MM-dd HH:mm:ss');
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            for (const subKey in value) {
                flattenedData[`${key}.${subKey}`] = value[subKey];
            }
        } else {
            flattenedData[key] = value;
        }
    }
    return flattenedData;
};


export default function BackupPage() {
  const { toast } = useToast();
  const { updateLastBackup } = useBackup();
  const [isExporting, setIsExporting] = React.useState(false);
  const [isExportingCsv, setIsExportingCsv] = React.useState<string | null>(null);
  const [isExportingJson, setIsExportingJson] = React.useState(false);
  const [isRestoring, setIsRestoring] = React.useState(false);

  const [importStates, setImportStates] = React.useState<Record<string, { file: File | null; loading: boolean }>>(
    COLLECTIONS_TO_IMPORT_CSV.reduce((acc, name) => ({ ...acc, [name]: { file: null, loading: false } }), {})
  );

  const handleFileSelect = (collectionName: string, file: File | null) => {
    setImportStates(prev => ({
        ...prev,
        [collectionName]: { ...prev[collectionName], file }
    }));
  };
  
  // --- JSON Functions ---
  const handleJsonExport = async () => {
    setIsExportingJson(true);
    const backupData: Record<string, any[]> = {};
    try {
        for (const collectionName of COLLECTIONS_TO_BACKUP) {
            const querySnapshot = await getDocs(collection(db, collectionName));
            backupData[collectionName] = querySnapshot.docs.map(doc => ({
                _id: doc.id,
                ...doc.data(),
            }));
        }
        const jsonString = JSON.stringify(backupData, (key, value) => {
            if (value && value.seconds !== undefined && value.nanoseconds !== undefined) {
                 return { _type: 'timestamp', value: new Date(value.seconds * 1000 + value.nanoseconds / 1000000).toISOString() };
            }
            return value;
        }, 2);

        downloadFile(jsonString, `backup_completo_${new Date().toISOString().split('T')[0]}.json`, 'application/json;charset=utf-8;');
        toast({ title: 'Backup JSON Concluído', description: 'Todos os dados foram exportados para um arquivo JSON.' });
        updateLastBackup();
    } catch (error) {
        console.error('Error creating JSON backup:', error);
        toast({ title: 'Erro no Backup JSON', description: 'Não foi possível gerar o arquivo .json.', variant: 'destructive' });
    } finally {
        setIsExportingJson(false);
    }
  };

  const handleJsonImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setIsRestoring(true);
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('File could not be read');
        }
        const data = JSON.parse(text, (key, value) => {
            if (value && value._type === 'timestamp') {
                return Timestamp.fromDate(new Date(value.value));
            }
            return value;
        });

        const batch = writeBatch(db);
        for (const collectionName in data) {
            const collectionData = data[collectionName];
            for (const docData of collectionData) {
                const { _id, ...rest } = docData;
                const docRef = doc(db, collectionName, _id);
                batch.set(docRef, rest);
            }
        }
        await batch.commit();
        toast({ title: 'Restauração Concluída', description: 'Os dados foram restaurados com sucesso a partir do arquivo JSON.' });
      } catch (error) {
        console.error('Error restoring from JSON:', error);
        toast({ title: 'Erro na Restauração', description: 'O arquivo pode estar corrompido ou mal formatado.', variant: 'destructive' });
      } finally {
        setIsRestoring(false);
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };


  // --- CSV / ZIP Functions ---
  const handleExportCsv = async (collectionName: string) => {
    setIsExportingCsv(collectionName);
    try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...flattenData(doc.data()) }));

        if (data.length === 0) {
            toast({ title: 'Nenhum dado para exportar', description: `A coleção "${collectionName}" está vazia.` });
            return;
        }
        const csv = Papa.unparse(data);
        downloadFile(csv, `backup_${collectionName}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
        toast({ title: 'Exportação Concluída', description: `Dados de "${collectionName}" exportados com sucesso.` });
        updateLastBackup();
    } catch (error) {
        console.error(`Error exporting ${collectionName} to CSV:`, error);
        toast({ title: 'Erro na Exportação', description: `Não foi possível exportar a coleção "${collectionName}".`, variant: 'destructive' });
    } finally {
        setIsExportingCsv(null);
    }
  };

  const handleGeneralBackup = async () => {
    setIsExporting(true);
    const zip = new JSZip();
    try {
        for (const collectionName of COLLECTIONS_TO_BACKUP) {
            const querySnapshot = await getDocs(collection(db, collectionName));
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...flattenData(doc.data()) }));
            if (data.length > 0) {
                const csv = Papa.unparse(data);
                zip.file(`${collectionName}.csv`, "\uFEFF" + csv);
            }
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `backup_geral_${new Date().toISOString().split('T')[0]}.zip`);
        toast({ title: 'Backup Geral Concluído', description: 'Todas as coleções foram exportadas e compactadas.' });
        updateLastBackup();
    } catch (error) {
        console.error('Error creating general backup:', error);
        toast({ title: 'Erro no Backup Geral', description: 'Não foi possível gerar o arquivo .zip.', variant: 'destructive' });
    } finally {
        setIsExporting(false);
    }
  };

  const handleCsvImport = async (collectionName: string) => {
    const { file } = importStates[collectionName];
    if (!file) {
        toast({ title: 'Nenhum arquivo selecionado', variant: 'destructive' });
        return;
    }

    setImportStates(prev => ({ ...prev, [collectionName]: { ...prev[collectionName], loading: true } }));

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            const data = results.data as any[];
            let successCount = 0;
            let errorCount = 0;

            const promises = data.map(async (row) => {
                try {
                    // Simple validation based on collection
                    if (collectionName === 'clientes' && !row.nomeRazaoSocial) throw new Error('Nome/Razão Social ausente');
                    if (collectionName === 'fornecedores' && !row.razaoSocial) throw new Error('Razão Social ausente');
                    if (collectionName === 'pecas' && !row.codigoPeca) throw new Error('Código da Peça ausente');
                    
                    const docData = { ...row };
                    if (collectionName === 'clientes' && (row['tipo.cliente'] || row['tipo.mecanico'])) {
                        docData.tipo = {
                            cliente: row['tipo.cliente'] === 'true',
                            mecanico: row['tipo.mecanico'] === 'true'
                        };
                        delete docData['tipo.cliente'];
                        delete docData['tipo.mecanico'];
                    }
                    if (docData.id) delete docData.id; // Remove ID to let Firestore auto-generate it

                    await addDoc(collection(db, collectionName), docData);
                    successCount++;
                } catch (e) {
                    errorCount++;
                    console.error(`Error importing row for ${collectionName}:`, e, row);
                }
            });

            await Promise.all(promises);

            toast({
                title: 'Importação Concluída',
                description: `${successCount} registros adicionados a "${collectionName}". ${errorCount} linhas ignoradas por erros.`,
            });

            setImportStates(prev => ({ ...prev, [collectionName]: { file: null, loading: false } }));
            const fileInput = document.getElementById(`import-file-${collectionName}`) as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        },
        error: (error) => {
            console.error('Error parsing CSV:', error);
            toast({ title: 'Erro de Leitura', description: 'Não foi possível ler o arquivo CSV.', variant: 'destructive' });
            setImportStates(prev => ({ ...prev, [collectionName]: { ...prev[collectionName], loading: false } }));
        }
    });
  }


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

      <Tabs defaultValue="export_csv">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="json">Backup & Restore (JSON)</TabsTrigger>
            <TabsTrigger value="export_csv">Exportação (CSV / .zip)</TabsTrigger>
            <TabsTrigger value="import_csv">Importação (CSV)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="json" className="space-y-6 pt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Backup Completo (Exportação JSON)</CardTitle>
                    <CardDescription>Crie um único arquivo JSON contendo todos os dados do sistema. Este é o formato mais fiel para um backup completo.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleJsonExport} disabled={isExportingJson} size="lg">
                        {isExportingJson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileJson className="mr-2 h-4 w-4" />}
                        Exportar Backup Completo (.json)
                    </Button>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Restauração Completa (Importação JSON)</CardTitle>
                    <CardDescription>Use um arquivo de backup JSON para restaurar os dados do sistema. Esta ação irá sobrescrever TODOS os dados existentes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10 mb-4">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-6 w-6 text-destructive" />
                            <h3 className="font-bold text-destructive">Atenção: Ação Irreversível</h3>
                        </div>
                        <p className="text-sm text-destructive/90 mt-2">
                           A restauração a partir de um arquivo JSON **substituirá todos os dados atuais** nas coleções pelos dados do arquivo. Esta ação não pode ser desfeita. Tenha certeza absoluta antes de prosseguir.
                        </p>
                    </div>
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="import-json">Selecione o arquivo .json</Label>
                        <Input
                            id="import-json"
                            type="file"
                            accept=".json"
                            onChange={handleJsonImport}
                            disabled={isRestoring}
                        />
                    </div>
                    {isRestoring && <div className="flex items-center gap-2 mt-4 text-primary"><Loader2 className="h-4 w-4 animate-spin" /> Restaurando dados, por favor aguarde...</div>}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="export_csv" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
                <CardTitle>Backup Geral (.zip)</CardTitle>
                <CardDescription>
                    Crie um único arquivo .zip contendo todas as coleções em formato CSV. Ideal para backups rápidos e portabilidade.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleGeneralBackup} disabled={isExporting} size="lg">
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileArchive className="mr-2 h-4 w-4" />}
                    Fazer Backup Geral (.zip)
                </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
                <CardTitle>Backup Individual (.csv)</CardTitle>
                <CardDescription>
                    Faça o download dos dados de uma coleção específica em formato CSV. Ideal para visualização e edição em planilhas.
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
                        {isExportingCsv === collectionName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                        Exportar {collectionName.charAt(0).toUpperCase() + collectionName.slice(1)}
                    </Button>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import_csv" className="space-y-6 pt-4">
            <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                    <h3 className="font-bold text-destructive">Atenção: Ação Irreversível</h3>
                </div>
                <p className="text-sm text-destructive/90 mt-2">
                  A importação de um arquivo CSV irá **adicionar novos registros** ao banco de dados. Esta ação não sobrescreve dados existentes e não pode ser desfeita facilmente. Certifique-se de que o arquivo e o formato estão corretos.
                </p>
            </div>
            {COLLECTIONS_TO_IMPORT_CSV.map((collectionName) => (
                <Card key={collectionName}>
                    <CardHeader>
                        <CardTitle>Importar {collectionName.charAt(0).toUpperCase() + collectionName.slice(1)}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor={`import-file-${collectionName}`}>Selecione o arquivo .csv</Label>
                            <Input
                                id={`import-file-${collectionName}`}
                                type="file"
                                accept=".csv"
                                onChange={(e) => handleFileSelect(collectionName, e.target.files ? e.target.files[0] : null)}
                                disabled={importStates[collectionName].loading}
                            />
                        </div>
                        <Button
                            onClick={() => handleCsvImport(collectionName)}
                            disabled={!importStates[collectionName].file || importStates[collectionName].loading}
                        >
                            {importStates[collectionName].loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Importar Dados
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
