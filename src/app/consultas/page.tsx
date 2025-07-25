
'use client';

import * as React from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  QueryConstraint,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Movimentacao, MovimentacaoGarantia, MovimentacaoDevolucao } from '@/types/firestore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { SearchCombobox } from '@/components/search-combobox';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Search, Loader2, X, MoreHorizontal, Edit, Trash, ArrowUpDown, Printer, Download, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { GarantiaForm } from '../movimentacoes/garantia/[id]/page';
import { DevolucaoForm } from '../movimentacoes/devolucao/[id]/page';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { UserOptions } from 'jspdf-autotable';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => jsPDFWithAutoTable;
}


const getStatusVariant = (status: MovimentacaoGarantia['acaoRetorno']) => {
  switch (status) {
    case 'Pendente':
      return 'default';
    case 'Aprovada':
      return 'success';
    case 'Recusada':
      return 'destructive';
    default:
      return 'secondary';
  }
};

interface Filters {
  tipoMovimentacao: 'Todas' | 'Devolução' | 'Garantia';
  statusGarantia: 'Todos' | 'Pendente' | 'Aprovada' | 'Recusada';
  dataInicio?: Date;
  dataFim?: Date;
  clienteId?: string | null;
  mecanicoId?: string | null;
  fornecedorId?: string | null;
  pecaCodigo: string;
  requisicaoVenda: string;
  numeroNF: string;
}

type SortableKeys = 'dataMovimentacao' | 'tipoMovimentacao' | 'pecaDescricao' | 'clienteNome' | 'acaoRetorno' | 'requisicaoVenda';

type SortConfig = {
    key: SortableKeys;
    direction: 'ascending' | 'descending';
} | null;


const initialFilters: Filters = {
  tipoMovimentacao: 'Todas',
  statusGarantia: 'Todos',
  dataInicio: undefined,
  dataFim: undefined,
  clienteId: null,
  mecanicoId: null,
  fornecedorId: null,
  pecaCodigo: '',
  requisicaoVenda: '',
  numeroNF: '',
};

const fetchMovimentacoes = async (filters: Filters): Promise<Movimentacao[]> => {
    const collectionRef = collection(db, 'movimentacoes');
    let constraints: QueryConstraint[] = [];

    if (filters.tipoMovimentacao !== 'Todas') {
        constraints.push(where('tipoMovimentacao', '==', filters.tipoMovimentacao));
    }
    if (
        filters.statusGarantia !== 'Todos' &&
        (filters.tipoMovimentacao === 'Garantia' || filters.tipoMovimentacao === 'Todas')
    ) {
        constraints.push(where('acaoRetorno', '==', filters.statusGarantia));
    }
    if (filters.dataInicio) {
        constraints.push(where('dataMovimentacao', '>=', Timestamp.fromDate(filters.dataInicio)));
    }
    if (filters.dataFim) {
        const endOfDay = new Date(filters.dataFim);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('dataMovimentacao', '<=', Timestamp.fromDate(endOfDay)));
    }
    if (filters.clienteId) {
        constraints.push(where('clienteId', '==', filters.clienteId));
    }
    if (filters.mecanicoId) {
        constraints.push(where('mecanicoId', '==', filters.mecanicoId));
    }
    if (filters.fornecedorId && (filters.tipoMovimentacao === 'Garantia' || filters.tipoMovimentacao === 'Todas')) {
        constraints.push(where('fornecedorId', '==', filters.fornecedorId));
    }
    if (filters.pecaCodigo) {
        constraints.push(where('pecaCodigo', '==', filters.pecaCodigo));
    }
    if (filters.requisicaoVenda) {
        constraints.push(where('requisicaoVenda', '==', filters.requisicaoVenda));
    }
    if (filters.numeroNF) {
        constraints.push(where('nfSaida', '==', filters.numeroNF));
    }

    const q = query(collectionRef, ...constraints);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Movimentacao)
    );
};

const reportColumns = [
    { id: 'dataMovimentacao', label: 'Data' },
    { id: 'tipoMovimentacao', label: 'Tipo' },
    { id: 'pecaCodigo', label: 'Cód. Peça' },
    { id: 'pecaDescricao', label: 'Descrição Peça' },
    { id: 'quantidade', label: 'Qtd' },
    { id: 'clienteNome', label: 'Cliente' },
    { id: 'mecanicoNome', label: 'Mecânico' },
    { id: 'fornecedorNome', label: 'Fornecedor' },
    { id: 'requisicaoVenda', label: 'Req. Venda' },
    { id: 'nfSaida', label: 'NF Saída' },
    { id: 'acaoRetorno', label: 'Status' },
];

export default function ConsultasPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filters, setFilters] = React.useState<Filters>(initialFilters);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({ key: 'dataMovimentacao', direction: 'descending' });
  
  const [editingGarantia, setEditingGarantia] = React.useState<MovimentacaoGarantia | null>(null);
  const [isGarantiaModalOpen, setIsGarantiaModalOpen] = React.useState(false);
  
  const [editingDevolucao, setEditingDevolucao] = React.useState<MovimentacaoDevolucao | null>(null);
  const [isDevolucaoModalOpen, setIsDevolucaoModalOpen] = React.useState(false);

  const [isReportModalOpen, setIsReportModalOpen] = React.useState(false);
  const [reportOptions, setReportOptions] = React.useState({
    columns: reportColumns.map(c => c.id),
    orientation: 'l' as 'p' | 'l',
  });

  const {
    data: movimentacoes,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['movimentacoes', filters],
    queryFn: () => fetchMovimentacoes(filters),
    enabled: false,
    refetchOnWindowFocus: false,
  });

  const sortedMovimentacoes = React.useMemo(() => {
    let sortableItems = [...(movimentacoes || [])];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;
  
        if (sortConfig.key === 'acaoRetorno') {
          aValue = a.tipoMovimentacao === 'Garantia' ? (a as MovimentacaoGarantia).acaoRetorno : '';
          bValue = b.tipoMovimentacao === 'Garantia' ? (b as MovimentacaoGarantia).acaoRetorno : '';
        } else {
          aValue = (a as any)[sortConfig.key];
          bValue = (b as any)[sortConfig.key];
        }
        
        if (aValue instanceof Timestamp && bValue instanceof Timestamp) {
            const aDate = aValue.toDate();
            const bDate = bValue.toDate();
            if (aDate < bDate) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aDate > bDate) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        }
        
        const valA = String(aValue || '').toLowerCase();
        const valB = String(bValue || '').toLowerCase();

        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        
        return 0;
      });
    }
    return sortableItems;
  }, [movimentacoes, sortConfig]);

  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };


  React.useEffect(() => {
    if (isError) {
      toast({
        title: 'Erro ao buscar dados',
        description:
          'Não foi possível realizar a consulta. Verifique os filtros e tente novamente.',
        variant: 'destructive',
      });
    }
  }, [isError, toast]);

  const handleFilterChange = <K extends keyof Filters>(
    key: K,
    value: Filters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setHasSearched(true);
    refetch();
  };

  const handleClearFilters = () => {
    setFilters(initialFilters);
    setHasSearched(false);
    setSortConfig({ key: 'dataMovimentacao', direction: 'descending' });
    queryClient.removeQueries({ queryKey: ['movimentacoes'] });
  };

  const handleEdit = (mov: Movimentacao) => {
    if (mov.tipoMovimentacao === 'Garantia') {
        setEditingGarantia(mov as MovimentacaoGarantia);
        setIsGarantiaModalOpen(true);
    } else if (mov.tipoMovimentacao === 'Devolução') {
        setEditingDevolucao(mov as MovimentacaoDevolucao);
        setIsDevolucaoModalOpen(true);
    }
  }

  const handleEditSuccess = () => {
    setIsGarantiaModalOpen(false);
    setEditingGarantia(null);
    setIsDevolucaoModalOpen(false);
    setEditingDevolucao(null);
    refetch(); 
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'movimentacoes', id));
      toast({
        title: 'Registro Excluído',
        description: 'A movimentação foi excluída com sucesso.',
      });
      refetch();
    } catch (error) {
      console.error('Error deleting movimentacao:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o registro.',
        variant: 'destructive',
      });
    }
  };
  
  const bufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  const handleGeneratePdf = async () => {
    if (!sortedMovimentacoes || sortedMovimentacoes.length === 0) {
      toast({ title: 'Nenhum dado para gerar relatório', variant: 'destructive' });
      return;
    }
  
    let logoBase64 = '';
    try {
      const response = await fetch('/images/logo.png');
      if (!response.ok) throw new Error('Logo not found');
      const imageBuffer = await response.arrayBuffer();
      logoBase64 = `data:image/png;base64,${bufferToBase64(imageBuffer)}`;

    } catch (error) {
      console.error("Error loading logo, proceeding without it.", error);
      toast({ title: "Logo não encontrado", description: "O relatório será gerado sem o logo da empresa.", variant: "destructive" });
    }
  
    const doc = new jsPDF({ orientation: reportOptions.orientation }) as jsPDFWithAutoTable;
    
    const pageCount = doc.internal.pages.length;
    const margin = 14; 
    
    const drawHeader = (data: any) => {
      // HEADER
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', data.settings.margin.left, 10, 40, 15);
      }
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Original Auto Peças', data.settings.margin.left + 45, 15, { align: 'left' });
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text("Rua Rui Barbosa, 400, Vila São José, Lins - SP, 16401-040", data.settings.margin.left + 45, 20);
      doc.text("Telefone: (14) 3532-3296 | E-mail: original-autopecas@hotmail.com", data.settings.margin.left + 45, 24);
    
      doc.setDrawColor(180, 180, 180);
      doc.line(data.settings.margin.left, 40, doc.internal.pageSize.getWidth() - data.settings.margin.right, 40);
    };

    const drawFooter = (data: any) => {
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setDrawColor(180, 180, 180);
        doc.line(data.settings.margin.left, pageHeight - 15, doc.internal.pageSize.getWidth() - data.settings.margin.right, pageHeight - 15);
  
        doc.setFontSize(8);
        doc.text(
          `Relatório emitido em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
          data.settings.margin.left,
          pageHeight - 10
        );
        doc.text(
          `Página ${data.pageNumber} de ${pageCount}`,
          doc.internal.pageSize.getWidth() - data.settings.margin.right,
          pageHeight - 10,
          { align: 'right' }
        );
    }
  
    const filtersSummary = appliedFiltersList();
    if (filtersSummary) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        const filtersText = `Filtros Aplicados: `;
        doc.text(filtersText, margin, 34);
        doc.setFont('helvetica', 'normal');
        doc.text(filtersSummary, margin + doc.getTextWidth(filtersText), 34, { maxWidth: doc.internal.pageSize.getWidth() - margin * 3 - doc.getTextWidth(filtersText) });
    }
  
    const selectedColumns = reportColumns.filter(c => reportOptions.columns.includes(c.id));
    const head = [selectedColumns.map(c => c.label)];
    const body = sortedMovimentacoes.map(mov => {
      return selectedColumns.map(col => {
        let value: any = '-';
  
        if (col.id === 'fornecedorNome') {
          value = mov.tipoMovimentacao === 'Garantia' ? (mov as MovimentacaoGarantia).fornecedorNome : 'N/A';
        } else if (col.id === 'acaoRetorno') {
          value = mov.tipoMovimentacao === 'Garantia' ? (mov as MovimentacaoGarantia).acaoRetorno : 'N/A';
        } else if (col.id in mov) {
          value = (mov as any)[col.id];
        }
  
        if (value instanceof Timestamp) {
          value = format(value.toDate(), 'dd/MM/yy HH:mm');
        } else if (value !== null && value !== undefined) {
          value = String(value);
        } else {
          value = '-';
        }
        return value;
      });
    });
  
    doc.autoTable({
      head: head,
      body: body,
      startY: 45,
      didDrawPage: (data) => {
        drawHeader(data);
        drawFooter(data);
      },
      margin: { top: 45, right: margin, bottom: 20, left: margin }
    });
  
    doc.save(`relatorio_movimentacoes_${new Date().toISOString().split('T')[0]}.pdf`);
    setIsReportModalOpen(false);
  };
  

  const handleExportCSV = () => {
    if (!sortedMovimentacoes || sortedMovimentacoes.length === 0) {
      toast({
        title: 'Nenhum dado para exportar',
        description: 'Faça uma busca antes de exportar.',
        variant: 'destructive',
      });
      return;
    }

    const dataToExport = sortedMovimentacoes.map(mov => ({
      'Data': format(mov.dataMovimentacao.toDate(), 'dd/MM/yyyy HH:mm:ss'),
      'Tipo': mov.tipoMovimentacao,
      'Cód. Peça': mov.pecaCodigo,
      'Descrição Peça': mov.pecaDescricao,
      'Cliente': mov.clienteNome,
      'Requisição': mov.requisicaoVenda,
      'Status Garantia': mov.tipoMovimentacao === 'Garantia' ? (mov as MovimentacaoGarantia).acaoRetorno : 'N/A',
      'Observação': mov.observacao
    }));

    const csv = Papa.unparse(dataToExport);
    const bom = "\uFEFF"; 
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_movimentacoes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const appliedFiltersList = () => {
    const list = [];
    if (filters.tipoMovimentacao !== 'Todas') list.push(`Tipo: ${filters.tipoMovimentacao}`);
    if (filters.statusGarantia !== 'Todos' && filters.tipoMovimentacao !== 'Devolução') list.push(`Status: ${filters.statusGarantia}`);
    if (filters.dataInicio) list.push(`De: ${format(filters.dataInicio, 'dd/MM/yy')}`);
    if (filters.dataFim) list.push(`Até: ${format(filters.dataFim, 'dd/MM/yy')}`);
    if (filters.pecaCodigo) list.push(`Cód. Peça: ${filters.pecaCodigo}`);
    if (filters.requisicaoVenda) list.push(`Requisição: ${filters.requisicaoVenda}`);
    if (filters.numeroNF) list.push(`NF: ${filters.numeroNF}`);
    return list.join('  •  ');
  }

  const isLoadingData = isLoading || isFetching;

  return (
    <div className="space-y-6">
       
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" /> Consultas e Relatórios
          </CardTitle>
          <CardDescription>
            Use os filtros para encontrar devoluções e garantias. Depois, gere um PDF ou exporte os resultados.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>Tipo de Movimentação</Label>
              <Select
                value={filters.tipoMovimentacao}
                onValueChange={(v) => handleFilterChange('tipoMovimentacao', v as any)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todas">Todas</SelectItem>
                  <SelectItem value="Devolução">Devolução</SelectItem>
                  <SelectItem value="Garantia">Garantia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status da Garantia</Label>
              <Select
                value={filters.statusGarantia}
                onValueChange={(v) => handleFilterChange('statusGarantia', v as any)}
                disabled={filters.tipoMovimentacao === 'Devolução'}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Aprovada">Aprovada</SelectItem>
                  <SelectItem value="Recusada">Recusada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !filters.dataInicio && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dataInicio ? format(filters.dataInicio, 'PPP', { locale: ptBR }) : <span>Escolha a data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={filters.dataInicio} onSelect={(d) => handleFilterChange('dataInicio', d)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Data de Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !filters.dataFim && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dataFim ? format(filters.dataFim, 'PPP', { locale: ptBR }) : <span>Escolha a data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={filters.dataFim} onSelect={(d) => handleFilterChange('dataFim', d)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <SearchCombobox
                collectionName="clientes"
                labelField="nomeRazaoSocial"
                searchField="nomeRazaoSocial"
                placeholder="Buscar cliente..."
                emptyMessage="Nenhum cliente encontrado."
                value={filters.clienteId ?? null}
                onChange={(v) => handleFilterChange('clienteId', v)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Mecânico</Label>
              <SearchCombobox
                collectionName="clientes"
                labelField="nomeRazaoSocial"
                searchField="nomeRazaoSocial"
                placeholder="Buscar mecânico..."
                emptyMessage="Nenhum mecânico encontrado."
                value={filters.mecanicoId ?? null}
                onChange={(v) => handleFilterChange('mecanicoId', v)}
                className="w-full"
                queryConstraints={[where('tipo.mecanico', '==', true)]}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Fornecedor</Label>
              <SearchCombobox
                collectionName="fornecedores"
                labelField={['razaoSocial', 'nomeFantasia']}
                searchField="razaoSocial"
                placeholder="Buscar fornecedor..."
                emptyMessage="Nenhum fornecedor encontrado."
                value={filters.fornecedorId ?? null}
                onChange={(v) => handleFilterChange('fornecedorId', v)}
                className="w-full"
                disabled={filters.tipoMovimentacao === 'Devolução'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requisicaoVenda">Nº da Requisição</Label>
              <Input
                id="requisicaoVenda"
                value={filters.requisicaoVenda}
                onChange={(e) => handleFilterChange('requisicaoVenda', e.target.value)}
                placeholder="Ex: 12345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numeroNF">Nº da NF</Label>
              <Input
                id="numeroNF"
                value={filters.numeroNF}
                onChange={(e) => handleFilterChange('numeroNF', e.target.value)}
                placeholder="Ex: 9876"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pecaCodigo">Código da Peça</Label>
              <Input
                id="pecaCodigo"
                value={filters.pecaCodigo}
                onChange={(e) => handleFilterChange('pecaCodigo', e.target.value)}
                placeholder="Ex: 12345"
              />
            </div>
            <div className="flex items-end justify-end gap-2">
              <Button onClick={handleSearch} disabled={isLoadingData}>
                {isLoadingData ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Search className="mr-2 h-4 w-4" />)}
                Filtrar
              </Button>
              <Button onClick={handleClearFilters} variant="ghost" disabled={isLoadingData}>
                <X className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="report-section">
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Resultados da Busca</CardTitle>
                    <CardDescription>
                        {hasSearched
                        ? `${sortedMovimentacoes?.length ?? 0} resultado(s) encontrado(s).`
                        : 'Aguardando busca...'}
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsReportModalOpen(true)} disabled={!sortedMovimentacoes || sortedMovimentacoes.length === 0}>
                        <Printer className="mr-2 h-4 w-4" />
                        Gerar Relatório
                    </Button>
                    <Button variant="outline" onClick={handleExportCSV} disabled={!sortedMovimentacoes || sortedMovimentacoes.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Exportar para CSV
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto print:overflow-visible">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                      <Button variant="ghost" onClick={() => requestSort('dataMovimentacao')}>
                          Data
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                  </TableHead>
                  <TableHead>
                      <Button variant="ghost" onClick={() => requestSort('tipoMovimentacao')}>
                          Tipo
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                  </TableHead>
                  <TableHead>
                      <Button variant="ghost" onClick={() => requestSort('pecaDescricao')}>
                          Peça
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                  </TableHead>
                  <TableHead>
                      <Button variant="ghost" onClick={() => requestSort('clienteNome')}>
                          Cliente
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                  </TableHead>
                  <TableHead>
                      <Button variant="ghost" onClick={() => requestSort('requisicaoVenda')}>
                          Requisição
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                  </TableHead>
                  <TableHead>
                      <Button variant="ghost" onClick={() => requestSort('acaoRetorno')}>
                          Status
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                  </TableHead>
                  <TableHead className="w-[80px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingData ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-1/2" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-1/2" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-1/2" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : hasSearched && sortedMovimentacoes && sortedMovimentacoes.length > 0 ? (
                  sortedMovimentacoes.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell>
                        {format(mov.dataMovimentacao.toDate(), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={mov.tipoMovimentacao === 'Garantia' ? 'secondary' : 'outline'}>
                          {mov.tipoMovimentacao}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{mov.pecaDescricao}</div>
                        <div className="text-xs text-muted-foreground">
                          Cód: {mov.pecaCodigo}
                        </div>
                      </TableCell>
                      <TableCell>{mov.clienteNome}</TableCell>
                      <TableCell>{mov.requisicaoVenda || '-'}</TableCell>
                      <TableCell>
                        {mov.tipoMovimentacao === 'Garantia' ? (
                          <Badge variant={getStatusVariant((mov as MovimentacaoGarantia).acaoRetorno)}>
                            {(mov as MovimentacaoGarantia).acaoRetorno}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                             <DropdownMenuItem onSelect={() => handleEdit(mov)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </DropdownMenuItem>
                           
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                                  <Trash className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirma a exclusão?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. O registro será permanentemente excluído.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(mov.id!)} className="bg-red-600 hover:bg-red-700">
                                    Sim, excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {hasSearched ? 'Nenhum resultado encontrado para os filtros aplicados.' : 'Use os filtros acima e clique em "Filtrar" para buscar.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {editingGarantia && (
        <Dialog open={isGarantiaModalOpen} onOpenChange={setIsGarantiaModalOpen}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Solicitação de Garantia</DialogTitle>
                    <DialogDescription>Altere os dados do registro de garantia.</DialogDescription>
                </DialogHeader>
                <GarantiaForm 
                    movimentacaoId={editingGarantia.id} 
                    onSaveSuccess={handleEditSuccess}
                    onCancel={() => setIsGarantiaModalOpen(false)}
                />
            </DialogContent>
        </Dialog>
      )}

      {editingDevolucao && (
        <Dialog open={isDevolucaoModalOpen} onOpenChange={setIsDevolucaoModalOpen}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Registro de Devolução</DialogTitle>
                    <DialogDescription>Altere os dados do registro de devolução.</DialogDescription>
                </DialogHeader>
                <DevolucaoForm 
                    movimentacaoId={editingDevolucao.id} 
                    onSaveSuccess={handleEditSuccess}
                    onCancel={() => setIsDevolucaoModalOpen(false)}
                />
            </DialogContent>
        </Dialog>
      )}

      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Opções do Relatório</DialogTitle>
            <DialogDescription>
              Selecione as colunas e a orientação para gerar o seu relatório em PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div>
              <Label className="font-semibold">Colunas do Relatório</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-60 overflow-y-auto pr-2 border rounded-md p-2">
                {reportColumns.map(col => (
                  <div key={col.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`col-${col.id}`}
                      checked={reportOptions.columns.includes(col.id)}
                      onCheckedChange={(checked) => {
                        setReportOptions(prev => ({
                          ...prev,
                          columns: checked
                            ? [...prev.columns, col.id]
                            : prev.columns.filter(c => c !== col.id),
                        }));
                      }}
                    />
                    <label htmlFor={`col-${col.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {col.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="font-semibold">Orientação da Página</Label>
              <RadioGroup
                value={reportOptions.orientation}
                onValueChange={(value: 'p' | 'l') => setReportOptions(prev => ({ ...prev, orientation: value }))}
                className="mt-2 space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="l" id="landscape" />
                  <Label htmlFor="landscape">Paisagem (Landscape)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="p" id="portrait" />
                  <Label htmlFor="portrait">Retrato (Portrait)</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReportModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleGeneratePdf}>Gerar PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    