
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
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Movimentacao, MovimentacaoGarantia } from '@/types/firestore';
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
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { SearchCombobox } from '@/components/search-combobox';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Search, Loader2, X, MoreHorizontal, Edit, Trash } from 'lucide-react';
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
import Link from 'next/link';

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

const fetchMovimentacoes = async (filters: Filters) => {
  const collectionRef = collection(db, 'movimentacoes');
  let constraints: QueryConstraint[] = [];
  let applyOrderBy = true;

  if (filters.tipoMovimentacao !== 'Todas') {
    constraints.push(where('tipoMovimentacao', '==', filters.tipoMovimentacao));
  }
  if (
    filters.statusGarantia !== 'Todos' &&
    (filters.tipoMovimentacao === 'Garantia' ||
      filters.tipoMovimentacao === 'Todas')
  ) {
    constraints.push(where('acaoRetorno', '==', filters.statusGarantia));
  }
  if (filters.dataInicio) {
    constraints.push(
      where('dataMovimentacao', '>=', Timestamp.fromDate(filters.dataInicio))
    );
    applyOrderBy = false;
  }
  if (filters.dataFim) {
    const endOfDay = new Date(filters.dataFim);
    endOfDay.setHours(23, 59, 59, 999);
    constraints.push(
      where('dataMovimentacao', '<=', Timestamp.fromDate(endOfDay))
    );
    applyOrderBy = false;
  }
  if (filters.clienteId) {
    constraints.push(where('clienteId', '==', filters.clienteId));
    applyOrderBy = false;
  }
  if (filters.mecanicoId) {
    constraints.push(where('mecanicoId', '==', filters.mecanicoId));
    applyOrderBy = false;
  }
  if (
    filters.fornecedorId &&
    (filters.tipoMovimentacao === 'Garantia' ||
      filters.tipoMovimentacao === 'Todas')
  ) {
    constraints.push(where('fornecedorId', '==', filters.fornecedorId));
    applyOrderBy = false;
  }
  if (filters.pecaCodigo) {
    constraints.push(where('pecaCodigo', '==', filters.pecaCodigo));
    applyOrderBy = false;
  }
  if (filters.requisicaoVenda) {
    constraints.push(where('requisicaoVenda', '==', filters.requisicaoVenda));
    applyOrderBy = false;
  }
  if (filters.numeroNF) {
    constraints.push(where('nfSaida', '==', filters.numeroNF));
    applyOrderBy = false;
  }

  // Only apply order by when no specific text filters are used to avoid composite index errors
  if (applyOrderBy) {
    constraints.push(orderBy('dataMovimentacao', 'desc'));
  }

  const q = query(collectionRef, ...constraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as Movimentacao)
  );
};

export default function ConsultasPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filters, setFilters] = React.useState<Filters>(initialFilters);
  const [submittedFilters, setSubmittedFilters] = React.useState<Filters | null>(
    null
  );

  const {
    data: movimentacoes,
    isLoading,
    isError,
    isFetching,
  } = useQuery({
    queryKey: ['movimentacoes', submittedFilters],
    queryFn: () => fetchMovimentacoes(submittedFilters!),
    enabled: !!submittedFilters,
  });

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
    setSubmittedFilters(filters);
  };

  const handleClearFilters = () => {
    setFilters(initialFilters);
    setSubmittedFilters(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'movimentacoes', id));
      toast({
        title: 'Registro Excluído',
        description: 'A movimentação foi excluída com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes', submittedFilters] });
    } catch (error) {
      console.error('Error deleting movimentacao:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o registro.',
        variant: 'destructive',
      });
    }
  };

  const isLoadingData = isLoading || isFetching;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-6 w-6" /> Consultar Movimentações
          </CardTitle>
          <CardDescription>
            Use os filtros para encontrar devoluções e garantias.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Linha 1 */}
            <div className="space-y-2">
              <Label>Tipo de Movimentação</Label>
              <Select
                value={filters.tipoMovimentacao}
                onValueChange={(v) =>
                  handleFilterChange('tipoMovimentacao', v as any)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                onValueChange={(v) =>
                  handleFilterChange('statusGarantia', v as any)
                }
                disabled={filters.tipoMovimentacao === 'Devolução'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !filters.dataInicio && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dataInicio ? (
                      format(filters.dataInicio, 'PPP', { locale: ptBR })
                    ) : (
                      <span>Escolha a data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.dataInicio}
                    onSelect={(d) => handleFilterChange('dataInicio', d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data de Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !filters.dataFim && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dataFim ? (
                      format(filters.dataFim, 'PPP', { locale: ptBR })
                    ) : (
                      <span>Escolha a data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.dataFim}
                    onSelect={(d) => handleFilterChange('dataFim', d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Linha 2 */}
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

            {/* Linha 3 */}
            <div className="space-y-2">
              <Label htmlFor="requisicaoVenda">Nº da Requisição</Label>
              <Input
                id="requisicaoVenda"
                value={filters.requisicaoVenda}
                onChange={(e) =>
                  handleFilterChange('requisicaoVenda', e.target.value)
                }
                placeholder="Ex: 12345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numeroNF">Nº da NF</Label>
              <Input
                id="numeroNF"
                value={filters.numeroNF}
                onChange={(e) =>
                  handleFilterChange('numeroNF', e.target.value)
                }
                placeholder="Ex: 9876"
              />
            </div>
             <div className="space-y-2">
                <Label htmlFor="pecaCodigo">Código da Peça</Label>
                 <Input
                    id="pecaCodigo"
                    value={filters.pecaCodigo}
                    onChange={(e) => handleFilterChange('pecaCodigo', e.target.value)}
                    placeholder="Ex: PD123"
                />
            </div>
            <div className="flex items-end justify-start gap-2">
              <Button onClick={handleSearch} disabled={isLoadingData}>
                {isLoadingData ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Filtrar
              </Button>
              <Button
                onClick={handleClearFilters}
                variant="ghost"
                disabled={isLoadingData}
              >
                <X className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {submittedFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados da Busca</CardTitle>
            <CardDescription>
              {movimentacoes
                ? `${movimentacoes.length} resultado(s) encontrado(s).`
                : 'Aguardando busca...'}
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
                  <TableHead className="w-[80px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingData ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-5 w-3/4" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-1/2" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-3/4" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-1/2" />
                      </TableCell>
                       <TableCell>
                        <Skeleton className="h-8 w-8 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : movimentacoes && movimentacoes.length > 0 ? (
                  movimentacoes.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell>
                        {mov.dataMovimentacao.toDate().toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            mov.tipoMovimentacao === 'Garantia'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {mov.tipoMovimentacao}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{mov.pecaDescricao}</div>
                        <div className="text-xs text-muted-foreground">
                          {mov.pecaCodigo}
                        </div>
                      </TableCell>
                      <TableCell>{mov.clienteNome}</TableCell>
                      <TableCell>
                        {mov.tipoMovimentacao === 'Garantia' ? (
                          <Badge
                            variant={getStatusVariant(
                              (mov as MovimentacaoGarantia).acaoRetorno
                            )}
                          >
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
                            <DropdownMenuItem asChild>
                               <Link href={`/movimentacoes/${mov.tipoMovimentacao.toLowerCase()}/${mov.id}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                               </Link>
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-red-600"
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Confirma a exclusão?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. O registro será
                                    permanentemente excluído.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(mov.id!)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
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
                    <TableCell colSpan={6} className="h-24 text-center">
                      Nenhum resultado encontrado para os filtros aplicados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
