
'use client';

import * as React from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  endBefore,
  limitToLast,
  Query,
  DocumentData,
  Timestamp,
  QueryConstraint,
  QueryDocumentSnapshot,
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
import { CalendarIcon, Search, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';


const ITEMS_PER_PAGE = 15;

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

export default function ConsultasPage() {
  const { toast } = useToast();
  
  // Filter States
  const [tipoMovimentacao, setTipoMovimentacao] = React.useState('Todas');
  const [statusGarantia, setStatusGarantia] = React.useState('Todos');
  const [dataInicio, setDataInicio] = React.useState<Date | undefined>();
  const [dataFim, setDataFim] = React.useState<Date | undefined>();
  const [clienteId, setClienteId] = React.useState<string | null>(null);
  const [codigoPeca, setCodigoPeca] = React.useState('');
  
  // Search Results
  const [movimentacoes, setMovimentacoes] = React.useState<Movimentacao[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Pagination
  const [lastVisible, setLastVisible] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisible, setFirstVisible] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [hasSearched, setHasSearched] = React.useState(false);


  const fetchMovimentacoes = React.useCallback(async (direction: 'next' | 'prev' | 'initial' = 'initial') => {
    setLoading(true);
    setHasSearched(true);
    try {
      const collectionRef = collection(db, 'movimentacoes');
      const constraints: QueryConstraint[] = [];

      // Build query based on filters
      if (tipoMovimentacao !== 'Todas') {
        constraints.push(where('tipoMovimentacao', '==', tipoMovimentacao));
      }
      if (statusGarantia !== 'Todos' && (tipoMovimentacao === 'Garantia' || tipoMovimentacao === 'Todas')) {
        constraints.push(where('acaoRetorno', '==', statusGarantia));
      }
      if (dataInicio) {
        constraints.push(where('dataMovimentacao', '>=', Timestamp.fromDate(dataInicio)));
      }
      if (dataFim) {
        const endOfDay = new Date(dataFim);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('dataMovimentacao', '<=', Timestamp.fromDate(endOfDay)));
      }
      if (clienteId) {
        constraints.push(where('clienteId', '==', clienteId));
      }
      if (codigoPeca) {
        constraints.push(where('pecaCodigo', '==', codigoPeca));
      }

      let q: Query<DocumentData>;
      const baseQuery = query(collectionRef, ...constraints, orderBy('dataMovimentacao', 'desc'));

      if (direction === 'initial') {
        q = query(baseQuery, limit(ITEMS_PER_PAGE));
      } else if (direction === 'next' && lastVisible) {
        q = query(baseQuery, startAfter(lastVisible), limit(ITEMS_PER_PAGE));
      } else if (direction === 'prev' && firstVisible) {
        q = query(baseQuery, endBefore(firstVisible), limitToLast(ITEMS_PER_PAGE));
      } else {
        q = query(baseQuery, limit(ITEMS_PER_PAGE));
      }
      
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Movimentacao));
      
      setMovimentacoes(data);

      if(querySnapshot.docs.length > 0) {
        setFirstVisible(querySnapshot.docs[0]);
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      } else {
        setFirstVisible(null);
        setLastVisible(null);
        if (direction !== 'initial') {
             toast({ title: "Fim dos Resultados", description: "Não há mais registros para exibir." });
        }
      }

    } catch (error) {
      console.error("Error fetching movimentacoes: ", error);
      toast({
        title: 'Erro ao buscar dados',
        description: 'Não foi possível realizar a consulta. Verifique os filtros e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [tipoMovimentacao, statusGarantia, dataInicio, dataFim, clienteId, codigoPeca, toast, lastVisible, firstVisible]);


  const handleSearch = () => {
    setCurrentPage(1);
    setFirstVisible(null);
    setLastVisible(null);
    fetchMovimentacoes('initial');
  }

  const handlePagination = (direction: 'next' | 'prev') => {
    const newPage = direction === 'next' ? currentPage + 1 : currentPage - 1;
    setCurrentPage(newPage > 0 ? newPage : 1);
    fetchMovimentacoes(direction);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-6 w-6"/> Consultar Movimentações</CardTitle>
          <CardDescription>Use os filtros para encontrar devoluções e garantias.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Tipo Movimentação */}
                <div className="space-y-2">
                    <Label>Tipo de Movimentação</Label>
                    <Select value={tipoMovimentacao} onValueChange={setTipoMovimentacao}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Todas">Todas</SelectItem>
                            <SelectItem value="Devolução">Devolução</SelectItem>
                            <SelectItem value="Garantia">Garantia</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {/* Status Garantia */}
                {(tipoMovimentacao === 'Garantia' || tipoMovimentacao === 'Todas') && (
                    <div className="space-y-2">
                         <Label>Status da Garantia</Label>
                        <Select value={statusGarantia} onValueChange={setStatusGarantia}>
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
                 {/* Código Peça */}
                <div className="space-y-2">
                    <Label htmlFor="codigoPeca">Código da Peça</Label>
                    <Input id="codigoPeca" value={codigoPeca} onChange={(e) => setCodigoPeca(e.target.value)} placeholder="Ex: FRAS-LE123"/>
                </div>

                {/* Datas */}
                <div className="space-y-2">
                    <Label>Data de Início</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataInicio && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dataInicio ? format(dataInicio, 'PPP', { locale: ptBR }) : <span>Escolha a data</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} initialFocus /></PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                     <Label>Data de Fim</Label>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataFim && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dataFim ? format(dataFim, 'PPP', { locale: ptBR }) : <span>Escolha a data</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dataFim} onSelect={setDataFim} initialFocus /></PopoverContent>
                    </Popover>
                </div>

                {/* Cliente */}
                <div className="space-y-2">
                    <Label>Cliente</Label>
                     <SearchCombobox
                        collectionName="clientes"
                        labelField="nomeRazaoSocial"
                        searchField="nomeRazaoSocial"
                        placeholder="Buscar cliente..."
                        emptyMessage="Nenhum cliente encontrado."
                        value={clienteId}
                        onChange={setClienteId}
                        className="w-full"
                    />
                </div>
            </div>
        </CardContent>
        <CardFooter>
            <Button onClick={handleSearch} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Filtrar
            </Button>
        </CardFooter>
      </Card>
      
      {hasSearched && (
        <Card>
            <CardHeader>
                <CardTitle>Resultados da Busca</CardTitle>
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
                        {loading ? (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /></TableCell></TableRow>
                        ) : movimentacoes.length > 0 ? (
                            movimentacoes.map(mov => (
                                <TableRow key={mov.id}>
                                    <TableCell>{format(mov.dataMovimentacao.toDate(), 'dd/MM/yyyy HH:mm')}</TableCell>
                                    <TableCell>{mov.tipoMovimentacao}</TableCell>
                                    <TableCell>{mov.pecaDescricao} ({mov.pecaCodigo})</TableCell>
                                    <TableCell>{mov.clienteNome}</TableCell>
                                    <TableCell>
                                        {mov.tipoMovimentacao === 'Garantia' ? (
                                            <Badge variant={getStatusVariant(mov.acaoRetorno)}>
                                                {mov.acaoRetorno}
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
                    Página {currentPage}
                </span>
                <div className="flex gap-2">
                    <Button 
                        variant="outline"
                        onClick={() => handlePagination('prev')}
                        disabled={currentPage === 1 || loading}
                    >
                        <ChevronsLeft className="h-4 w-4" />
                        Anterior
                    </Button>
                    <Button 
                        variant="outline"
                        onClick={() => handlePagination('next')}
                        disabled={movimentacoes.length < ITEMS_PER_PAGE || loading}
                    >
                        Próximo
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
      )}
    </div>
  );
}
