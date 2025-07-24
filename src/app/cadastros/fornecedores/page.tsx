
'use client';

import * as React from 'react';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  startAfter,
  orderBy,
  getCountFromServer,
  endBefore,
  limitToLast,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Fornecedor } from '@/types/firestore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Edit,
  MoreHorizontal,
  PlusCircle,
  Trash,
  ChevronsLeft,
  ChevronsRight,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { FornecedorForm } from './FornecedorForm';

const ITEMS_PER_PAGE = 10;

function FornecedorTable({
  fornecedores,
  onEdit,
  onInactivate,
  onDelete,
  onReactivate,
  isInactive = false,
}: {
  fornecedores: Fornecedor[];
  onEdit: (fornecedor: Fornecedor) => void;
  onInactivate: (id: string) => void;
  onDelete: (id: string) => void;
  onReactivate: (id: string) => void;
  isInactive?: boolean;
}) {

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Razão Social</TableHead>
          <TableHead>Nome Fantasia</TableHead>
          <TableHead>CNPJ</TableHead>
          <TableHead className="w-[80px] text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {fornecedores.length > 0 ? (
          fornecedores.map((fornecedor) => (
            <TableRow key={fornecedor.id}>
              <TableCell>{fornecedor.razaoSocial}</TableCell>
              <TableCell>{fornecedor.nomeFantasia || '-'}</TableCell>
              <TableCell>{fornecedor.cnpj}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Abrir menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                     {!isInactive && (
                        <DropdownMenuItem onClick={() => onEdit(fornecedor)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                      )}
                      {isInactive ? (
                        <DropdownMenuItem onClick={() => onReactivate(fornecedor.id!)}>
                          <ArchiveRestore className="mr-2 h-4 w-4" />
                          Reativar
                        </DropdownMenuItem>
                      ) : (
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Archive className="mr-2 h-4 w-4" />
                                Inativar
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação irá inativar o fornecedor. Ele não aparecerá
                                  na lista principal, mas poderá ser reativado.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onInactivate(fornecedor.id!)}>
                                  Sim, inativar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      )}
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                            <Trash className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirma a exclusão permanente?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O fornecedor será
                              permanentemente excluído do banco de dados.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(fornecedor.id!)} className="bg-red-600 hover:bg-red-700">
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
            <TableCell colSpan={4} className="h-24 text-center">
              Nenhum fornecedor encontrado.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}


export default function FornecedoresPage() {
  const { toast } = useToast();
  const [fornecedoresAtivos, setFornecedoresAtivos] = React.useState<Fornecedor[]>([]);
  const [fornecedoresInativos, setFornecedoresInativos] = React.useState<Fornecedor[]>([]);
  const [editingFornecedor, setEditingFornecedor] = React.useState<Fornecedor | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const [lastVisibleAtivo, setLastVisibleAtivo] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisibleAtivo, setFirstVisibleAtivo] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [currentPageAtivo, setCurrentPageAtivo] = React.useState(1);
  const [totalFornecedoresAtivos, setTotalFornecedoresAtivos] = React.useState(0);

  const [lastVisibleInativo, setLastVisibleInativo] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisibleInativo, setFirstVisibleInativo] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [currentPageInativo, setCurrentPageInativo] = React.useState(1);
  const [totalFornecedoresInativos, setTotalFornecedoresInativos] = React.useState(0);

  const fetchFornecedores = React.useCallback(async (
    status: 'Ativo' | 'Inativo',
    direction: 'next' | 'prev' | 'initial' = 'initial'
  ) => {
    try {
      const collectionRef = collection(db, 'fornecedores');
      const statusQuery = where('status', '==', status);

      const totalSnapshot = await getCountFromServer(query(collectionRef, statusQuery));
      if (status === 'Ativo') {
        setTotalFornecedoresAtivos(totalSnapshot.data().count);
      } else {
        setTotalFornecedoresInativos(totalSnapshot.data().count);
      }
      
      let q;
      const lastVisible = status === 'Ativo' ? lastVisibleAtivo : lastVisibleInativo;
      const firstVisible = status === 'Ativo' ? firstVisibleAtivo : firstVisibleInativo;

      if (direction === 'initial') {
        q = query(collectionRef, statusQuery, orderBy('razaoSocial'), limit(ITEMS_PER_PAGE));
      } else if (direction === 'next' && lastVisible) {
        q = query(collectionRef, statusQuery, orderBy('razaoSocial'), startAfter(lastVisible), limit(ITEMS_PER_PAGE));
      } else if (direction === 'prev' && firstVisible) {
        q = query(collectionRef, statusQuery, orderBy('razaoSocial'), endBefore(firstVisible), limitToLast(ITEMS_PER_PAGE));
      } else {
         q = query(collectionRef, statusQuery, orderBy('razaoSocial'), limit(ITEMS_PER_PAGE));
      }
      
      const querySnapshot = await getDocs(q);
      const fornecedoresData = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Fornecedor)
      );
      
      if (status === 'Ativo') {
        setFornecedoresAtivos(fornecedoresData);
         if (querySnapshot.docs.length > 0) {
            setFirstVisibleAtivo(querySnapshot.docs[0]);
            setLastVisibleAtivo(querySnapshot.docs[querySnapshot.docs.length - 1]);
        }
      } else {
        setFornecedoresInativos(fornecedoresData);
        if (querySnapshot.docs.length > 0) {
            setFirstVisibleInativo(querySnapshot.docs[0]);
            setLastVisibleInativo(querySnapshot.docs[querySnapshot.docs.length - 1]);
        }
      }

    } catch (error) {
      console.error('Error fetching fornecedores:', error);
      toast({
        title: 'Erro ao buscar fornecedores',
        description: `Não foi possível carregar a lista de fornecedores ${status === 'Ativo' ? 'ativos' : 'inativos'}.`,
        variant: 'destructive',
      });
    }
  }, [toast, lastVisibleAtivo, firstVisibleAtivo, lastVisibleInativo, firstVisibleInativo]);

  React.useEffect(() => {
    fetchFornecedores('Ativo', 'initial');
    fetchFornecedores('Inativo', 'initial');
  }, [fetchFornecedores]);

  const handlePagination = (status: 'Ativo' | 'Inativo', direction: 'next' | 'prev') => {
    if (status === 'Ativo') {
        const newPage = direction === 'next' ? currentPageAtivo + 1 : currentPageAtivo - 1;
        setCurrentPageAtivo(newPage);
        fetchFornecedores(status, direction);
    } else {
        const newPage = direction === 'next' ? currentPageInativo + 1 : currentPageInativo - 1;
        setCurrentPageInativo(newPage);
        fetchFornecedores(status, direction);
    }
  };

  const handleSaveSuccess = () => {
    setIsFormOpen(false);
    setEditingFornecedor(null);
    fetchFornecedores('Ativo', 'initial');
    fetchFornecedores('Inativo', 'initial');
    setCurrentPageAtivo(1);
    setCurrentPageInativo(1);
  };

  const handleEdit = (fornecedor: Fornecedor) => {
    setEditingFornecedor(fornecedor);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleNew = () => {
    setEditingFornecedor(null);
    setIsFormOpen(true);
  }

  const handleCancel = () => {
    setEditingFornecedor(null);
    setIsFormOpen(false);
  };
  
  const handleStatusChange = async (id: string, status: 'Ativo' | 'Inativo') => {
    try {
      const fornecedorDocRef = doc(db, 'fornecedores', id);
      await updateDoc(fornecedorDocRef, { status });
      toast({
        title: `Fornecedor ${status === 'Ativo' ? 'Reativado' : 'Inativado'}`,
        description: `O fornecedor foi movido para ${status === 'Ativo' ? 'ativos' : 'inativos'}.`,
      });
      handleSaveSuccess();
    } catch (error) {
      console.error(`Error ${status === 'Ativo' ? 'reactivating' : 'inactivating'} fornecedor:`, error);
      toast({
        title: `Erro ao ${status === 'Ativo' ? 'reativar' : 'inativar'}`,
        description: `Não foi possível ${status === 'Ativo' ? 'reativar' : 'inativar'} o fornecedor.`,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'fornecedores', id));
      toast({
        title: 'Fornecedor Excluído',
        description: 'O fornecedor foi permanentemente excluído.',
      });
      handleSaveSuccess();
    } catch (error) {
      console.error('Error deleting fornecedor:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o fornecedor.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
          <div>
          <h1 className="text-3xl font-bold tracking-tight">Cadastro de Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie seus fornecedores.</p>
          </div>
          {!isFormOpen && (
              <Button onClick={handleNew}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Novo Fornecedor
              </Button>
          )}
      </div>

      {isFormOpen && (
        <Card>
          <CardHeader>
              <CardTitle>{editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}</CardTitle>
              <CardDescription>Preencha os dados do fornecedor.</CardDescription>
          </CardHeader>
          <CardContent>
            <FornecedorForm 
                initialValues={editingFornecedor}
                onSaveSuccess={handleSaveSuccess}
                onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      )}

      {!isFormOpen && (
        <Tabs defaultValue="ativos">
            <TabsList>
                <TabsTrigger value="ativos">Ativos</TabsTrigger>
                <TabsTrigger value="inativos">Inativos</TabsTrigger>
            </TabsList>
            <TabsContent value="ativos">
                <Card>
                    <CardHeader>
                    <CardTitle>Fornecedores Ativos</CardTitle>
                    <CardDescription>Lista de fornecedores ativos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FornecedorTable 
                            fornecedores={fornecedoresAtivos}
                            onEdit={handleEdit}
                            onInactivate={(id) => handleStatusChange(id, 'Inativo')}
                            onDelete={handleDelete}
                            onReactivate={(id) => handleStatusChange(id, 'Ativo')}
                        />
                    </CardContent>
                    <CardFooter className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                            Página {currentPageAtivo} de {Math.ceil(totalFornecedoresAtivos / ITEMS_PER_PAGE)}
                        </span>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline"
                                onClick={() => handlePagination('Ativo', 'prev')}
                                disabled={currentPageAtivo === 1}
                            >
                                <ChevronsLeft className="h-4 w-4" />
                                Anterior
                            </Button>
                            <Button 
                                variant="outline"
                                onClick={() => handlePagination('Ativo', 'next')}
                                disabled={currentPageAtivo >= Math.ceil(totalFornecedoresAtivos / ITEMS_PER_PAGE)}
                            >
                                Próximo
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </TabsContent>
            <TabsContent value="inativos">
                <Card>
                    <CardHeader>
                    <CardTitle>Fornecedores Inativos</CardTitle>
                    <CardDescription>Lista de fornecedores inativos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FornecedorTable 
                            fornecedores={fornecedoresInativos}
                            onEdit={handleEdit}
                            onInactivate={(id) => handleStatusChange(id, 'Inativo')}
                            onDelete={handleDelete}
                            onReactivate={(id) => handleStatusChange(id, 'Ativo')}
                            isInactive
                        />
                    </CardContent>
                    <CardFooter className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                            Página {currentPageInativo} de {Math.ceil(totalFornecedoresInativos / ITEMS_PER_PAGE)}
                        </span>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline"
                                onClick={() => handlePagination('Inativo', 'prev')}
                                disabled={currentPageInativo === 1}
                            >
                                <ChevronsLeft className="h-4 w-4" />
                                Anterior
                            </Button>
                            <Button 
                                variant="outline"
                                onClick={() => handlePagination('Inativo', 'next')}
                                disabled={currentPageInativo >= Math.ceil(totalFornecedoresInativos / ITEMS_PER_PAGE)}
                            >
                                Próximo
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
