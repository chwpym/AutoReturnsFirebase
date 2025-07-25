
'use client';

import * as React from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Movimentacao, MovimentacaoGarantia } from '@/types/firestore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
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
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { SearchCombobox } from '@/components/search-combobox';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Search, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

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
}

interface Filters {
    tipoMovimentacao: 'Todas' | 'Devolução' | 'Garantia';
    statusGarantia: 'Todos' | 'Pendente' | 'Aprovada' | 'Recusada';
    dataInicio?: Date;
    dataFim?: Date;
    clienteId?: string | null;
    mecanicoId?: string | null;
    fornecedorId?: string | null;
    codigoPeca: string;
    requisicaoVenda: string;
    numeroNF: string;
}

const initialFilters: Filters = {
    tipoMovimentacao: 'Todas',
    statusGarantia: 'Todos',
    dataInicio: undefined,
    dataFim: undefined,
    clienteId: null,
    mecanicoId: null,
    fornecedorId: null,
    codigoPeca: '',
    requisicaoVenda: '',
    numeroNF: '',
};

const fetchMovimentacoes = async (filters: Filters) => {
    const collectionRef = collection(db, 'movimentacoes');
    const constraints: QueryConstraint[] = [];

    if (filters.tipoMovimentacao !== 'Todas') {
      constraints.push(where('tipoMovimentacao', '==', filters.tipoMovimentacao));
    }
    if (filters.statusGarantia !== 'Todos' && (filters.tipoMovimentacao === 'Garantia' || filters.tipoMovimentacao === 'Todas')) {
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
    if (filters.codigoPeca) {
      constraints.push(where('pecaCodigo', '==', filters.codigoPeca));
    }
    if(filters.requisicaoVenda) {
        constraints.push(where('requisicaoVenda', '==', filters.requisicaoVenda));
    }
    if(filters.numeroNF) {
        // As Firestore has limitations on OR queries, we search in nfSaida.
        // For a more complex search, multiple queries would be needed.
        constraints.push(where('nfSaida', '==', filters.numeroNF));
    }

    const q = query(collectionRef, ...constraints, orderBy('dataMovimentacao', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Movimentacao));
}


export default function ConsultasPage() {
  const { toast } = useToast();
  
  const [filters, setFilters] = React.useState<Filters>(initialFilters);
  const [submittedFilters, setSubmittedFilters] = React.useState<Filters | null>(null);

  const { data: movimentacoes, isLoading, isError, isFetching } = useQuery({
      queryKey: ['movimentacoes', submittedFilters],
      queryFn: () => fetchMovimentacoes(submittedFilters!),
      enabled: !!submittedFilters,
  });

   React.useEffect(() => {
    if (isError) {
      toast({
        title: 'Erro ao buscar dados',
        description: 'Não foi possível realizar a consulta. Verifique os filtros e tente novamente.',
        variant: 'destructive',
      });
    }
  }, [isError, toast]);

  const handleFilterChange = <K extends keyof Filters>(key: K, value: Filters[K]) => {
      setFilters(prev => ({...prev, [key]: value}));
  };

  const handleSearch = () => {
    setSubmittedFilters(filters);
  }
  
  const handleClearFilters = () => {
      setFilters(initialFilters);
      setSubmittedFilters(null);
  }

  const isLoadingData = isLoading || isFetching;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-6 w-6"/> Consultar Movimentações</CardTitle>
          <CardDescription>Use os filtros para encontrar devoluções e garantias.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                    <Label>Tipo de Movimentação</Label>
                    <Select value={filters.tipoMovimentacao} onValueChange={(v) => handleFilterChange('tipoMovimentacao', v as Filters['tipoMovimentacao'])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Todas">Todas</SelectItem>
                            <SelectItem value="Devolução">Devolução</SelectItem>
                            <SelectItem value="Garantia">Garantia</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {(filters.tipoMovimentacao === 'Garantia' || filters.tipoMovimentacao === 'Todas') && (
                    <div className="space-y-2">
                         <Label>Status da Garantia</Label>
                        <Select value={filters.statusGarantia} onValueChange={(v) => handleFilterChange('statusGarantia', v as Filters['statusGarantia'])}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Todos">Todos</SelectItem>
                                <SelectItem value="Pendente">Pendente</SelectItem>
                                <SelectItem value="Aprovada">Aprovada</SelectItem>
                                <SelectItem value="Recusada">Recusada</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
                
                <div className="space-y-2">
                    <Label>Data de Início</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !filters.dataInicio && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filters.dataInicio ? format(filters.dataInicio, 'PPP', { locale: ptBR }) : <span>Escolha a data</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filters.dataInicio} onSelect={(d) => handleFilterChange('dataInicio', d)} initialFocus /></PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-2">
                     <Label>Data de Fim</Label>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !filters.dataFim && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filters.dataFim ? format(filters.dataFim, 'PPP', { locale: ptBR }) : <span>Escolha a data</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filters.dataFim} onSelect={(d) => handleFilterChange('dataFim', d)} initialFocus /></PopoverContent>
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
                        queryConstraints={[where('tipo.mecanico', '==', true)]}
                        placeholder="Buscar mecânico..."
                        emptyMessage="Nenhum mecânico encontrado."
                        value={filters.mecanicoId ?? null}
                        onChange={(v) => handleFilterChange('mecanicoId', v)}
                        className="w-full"
                    />
                </div>
                 {(filters.tipoMovimentacao === 'Garantia' || filters.tipoMovimentacao === 'Todas') && (
                    <div className="space-y-2">
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
                        />
                    </div>
                )}
                <div className="space-y-2">
                    <Label htmlFor="codigoPeca">Código da Peça</Label>
                    <Input id="codigoPeca" value={filters.codigoPeca} onChange={(e) => handleFilterChange('codigoPeca', e.target.value)} placeholder="Ex: FRAS-LE123"/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="requisicaoVenda">Nº da Requisição</Label>
                    <Input id="requisicaoVenda" value={filters.requisicaoVenda} onChange={(e) => handleFilterChange('requisicaoVenda', e.target.value)} placeholder="Ex: 12345"/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="numeroNF">Nº da NF</Label>
                    <Input id="numeroNF" value={filters.numeroNF} onChange={(e) => handleFilterChange('numeroNF', e.target.value)} placeholder="Ex: 9876"/>
                </div>
            </div>
        </CardContent>
        <CardFooter className="gap-2">
            <Button onClick={handleSearch} disabled={isLoadingData}>
                {isLoadingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Filtrar
            </Button>
            <Button onClick={handleClearFilters} variant="ghost" disabled={isLoadingData}>
                <X className="mr-2 h-4 w-4" />
                Limpar Filtros
            </Button>
        </CardFooter>
      </Card>
      
      {submittedFilters && (
        <Card>
            <CardHeader>
                <CardTitle>Resultados da Busca</CardTitle>
                 <CardDescription>
                    {movimentacoes ? `${movimentacoes.length} resultado(s) encontrado(s).` : 'Aguardando busca...'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Peça</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Status</TableHead>
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
                               </TableRow>
                            ))
                        ) : movimentacoes && movimentacoes.length > 0 ? (
                            movimentacoes.map(mov => (
                                <TableRow key={mov.id}>
                                    <TableCell>{format(mov.dataMovimentacao.toDate(), 'dd/MM/yyyy HH:mm')}</TableCell>
                                    <TableCell>
                                        <Badge variant={mov.tipoMovimentacao === 'Garantia' ? 'secondary' : 'outline'}>{mov.tipoMovimentacao}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{mov.pecaDescricao}</div>
                                        <div className="text-xs text-muted-foreground">{mov.pecaCodigo}</div>
                                    </TableCell>
                                    <TableCell>{mov.clienteNome}</TableCell>
                                    <TableCell>
                                        {mov.tipoMovimentacao === 'Garantia' ? (
                                            <Badge variant={getStatusVariant((mov as MovimentacaoGarantia).acaoRetorno)}>
                                                {(mov as MovimentacaoGarantia).acaoRetorno}
                                            </Badge>
                                        ) : (
                                            '-'
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center">Nenhum resultado encontrado para os filtros aplicados.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
             <CardFooter className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                    {movimentacoes ? `${movimentacoes.length} resultado(s)` : ''}
                </span>
             </CardFooter>
        </Card>
      )}
    </div>
  );
}
