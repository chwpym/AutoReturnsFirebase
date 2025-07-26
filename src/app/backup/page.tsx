
'use client';

import * as React from 'react';
import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, Loader2, DatabaseBackup } from 'lucide-react';
import Papa from 'papaparse';

type CollectionName = 'clientes' | 'fornecedores' | 'pecas' | 'movimentacoes';

const collectionLabels: Record<CollectionName, string> = {
  clientes: 'Clientes/Mecânicos',
  fornecedores: 'Fornecedores',
  pecas: 'Peças',
  movimentacoes: 'Movimentações',
};

// Define required fields for validation during import
const requiredFields: Record<string, string[]> = {
  clientes: ['nomeRazaoSocial', 'tipo'],
  fornecedores: ['razaoSocial', 'cnpj'],
  pecas: ['codigoPeca', 'descricao'],
};

// Helper function to download CSV
const downloadCSV = (data: any[], filename: string) => {
  const csv = Papa.unparse(data);
  const bom = '\uFEFF';
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
  const [loading, setLoading] = React.useState<Partial<Record<CollectionName, boolean>>>({});
  const [file, setFile] = React.useState<Partial<Record<string, File | null>>>({});
  const [importing, setImporting] = React.useState<Partial<Record<string, boolean>>>({});
  
  const handleExport = async (collectionName: CollectionName) => {
    setLoading(prev => ({ ...prev, [collectionName]: true }));
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const data = querySnapshot.docs.map(doc => {
        const docData = doc.data();
        // Convert Firestore Timestamps to ISO strings for CSV
        Object.keys(docData).forEach(key => {
          if (docData[key] instanceof Timestamp) {
            docData[key] = docData[key].toDate().toISOString();
          }
        });
        return { id: doc.id, ...docData };
      });

      downloadCSV(data, `backup_${collectionName}_${new Date().toISOString().split('T')[0]}`);

      toast({
        title: 'Exportação Concluída',
        description: `${collectionLabels[collectionName]} exportados com sucesso.`,
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: 'Erro na Exportação',
        description: `Não foi possível exportar os dados de ${collectionLabels[collectionName]}.`,
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, [collectionName]: false }));
    }
  };

  const handleFileChange = (collectionName: string, selectedFile: File | null) => {
    setFile(prev => ({ ...prev, [collectionName]: selectedFile }));
  };

  const handleImport = async (collectionName: string) => {
    const currentFile = file[collectionName];
    if (!currentFile) {
        toast({ title: 'Nenhum arquivo selecionado', variant: 'destructive' });
        return;
    }

    setImporting(prev => ({ ...prev, [collectionName]: true }));

    Papa.parse(currentFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        let successCount = 0;
        let errorCount = 0;

        const promises = data.map(async (row) => {
          // Validate required fields
          const fields = requiredFields[collectionName];
          const isValid = fields.every(field => row[field] && row[field].trim() !== '');

          if (!isValid) {
            errorCount++;
            return;
          }

          try {
            // Firestore doesn't like 'id' field on creation
            const { id, ...rowData } = row;
            
            // Re-process specific fields if needed
            if (collectionName === 'clientes' && typeof rowData.tipo === 'string') {
              try {
                rowData.tipo = JSON.parse(rowData.tipo.replace(/'/g, '"'));
              } catch (e) {
                console.warn('Could not parse "tipo" field for client, skipping:', rowData);
                errorCount++;
                return;
              }
            }

            await addDoc(collection(db, collectionName), rowData);
            successCount++;
          } catch (e) {
            console.error('Error importing row:', row, e);
            errorCount++;
          }
        });

        await Promise.all(promises);

        toast({
          title: 'Importação Concluída',
          description: `${successCount} registros de ${collectionLabels[collectionName as CollectionName]} adicionados. ${errorCount} registros ignorados por erros.`,
        });

        setImporting(prev => ({ ...prev, [collectionName]: false }));
        setFile(prev => ({...prev, [collectionName]: null}))
      },
      error: (error) => {
        toast({
          title: 'Erro ao ler o arquivo',
          description: error.message,
          variant: 'destructive',
        });
        setImporting(prev => ({ ...prev, [collectionName]: false }));
      }
    });
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
            Gerencie a importação e exportação dos dados do seu sistema.
          </p>
        </div>
      </div>

      <Tabs defaultValue="export">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export">
            <Download className="mr-2 h-4 w-4" /> Exportar (Backup)
          </TabsTrigger>
          <TabsTrigger value="import">
            <Upload className="mr-2 h-4 w-4" /> Importar (Restauração)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Exportar Dados</CardTitle>
              <CardDescription>
                Faça o download de todos os seus dados em formato CSV. Recomenda-se realizar backups periodicamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['clientes', 'fornecedores', 'pecas', 'movimentacoes'] as CollectionName[]).map(name => (
                <div key={name} className="flex items-center justify-between p-4 border rounded-lg">
                  <span className="font-medium">{collectionLabels[name]}</span>
                  <Button
                    onClick={() => handleExport(name)}
                    disabled={loading[name]}
                    variant="outline"
                  >
                    {loading[name] ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Exportar para CSV
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>Importar Dados</CardTitle>
              <CardDescription>
                Selecione um arquivo CSV para importar dados. Atenção: Esta ação adicionará novos registros, não irá atualizar ou remover existentes. Use com cuidado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 {(['clientes', 'fornecedores', 'pecas'] as const).map(name => (
                    <div key={name} className="p-4 border rounded-lg space-y-4">
                         <h3 className="font-medium">{`Importar ${collectionLabels[name]}`}</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor={`file-${name}`}>Selecione o arquivo CSV</Label>
                                <Input 
                                    id={`file-${name}`} 
                                    type="file" 
                                    accept=".csv"
                                    onChange={(e) => handleFileChange(name, e.target.files ? e.target.files[0] : null)}
                                />
                            </div>
                            <Button 
                                onClick={() => handleImport(name)}
                                disabled={!file[name] || importing[name]}
                            >
                                {importing[name] ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Upload className="mr-2 h-4 w-4" />
                                )}
                                Importar Dados
                            </Button>
                         </div>
                    </div>
                ))}
                 <div className="p-4 border rounded-lg bg-muted/50">
                     <h3 className="font-medium">Importar Movimentações</h3>
                     <p className="text-sm text-muted-foreground mt-2">
                        A importação de movimentações (devoluções e garantias) não é suportada por ser uma operação de alto risco que envolve múltiplas coleções e pode levar a inconsistências nos dados.
                     </p>
                </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
