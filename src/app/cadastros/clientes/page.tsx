
'use client';

import * as React from 'react';
import {
  collection,
  addDoc,
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
import type { Cliente } from '@/types/firestore';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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
  DropdownMenuSeparator,
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
import { cn } from '@/lib/utils';

const clienteSchema = z
  .object({
    nomeRazaoSocial: z.string().min(3, 'Nome/Razão Social é obrigatório.'),
    nomeFantasia: z.string().optional(),
    tipo: z
      .object({
        cliente: z.boolean().default(false),
        mecanico: z.boolean().default(false),
      })
      .refine((data) => data.cliente || data.mecanico, {
        message: 'Selecione pelo menos um tipo.',
      }),
    status: z.enum(['Ativo', 'Inativo']).default('Ativo'),
    observacao: z.string().optional(),
  })
  .passthrough();

type ClienteFormValues = z.infer<typeof clienteSchema>;

const ITEMS_PER_PAGE = 10;

interface ClientePageProps {
    isModal?: boolean;
    onSaveSuccess?: (newItem: { value: string; label: string }) => void;
    onCancel?: () => void;
}

function ClienteTable({
  clientes,
  onEdit,
  onInactivate,
  onDelete,
  onReactivate,
  isInactive = false,
}: {
  clientes: Cliente[];
  onEdit: (cliente: Cliente) => void;
  onInactivate: (id: string) => void;
  onDelete: (id: string) => void;
  onReactivate: (id: string) => void;
  isInactive?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome / Razão Social</TableHead>
          <TableHead>Nome Fantasia</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="w-[80px] text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clientes.length > 0 ? (
          clientes.map((cliente) => (
            <TableRow key={cliente.id}>
              <TableCell>{cliente.nomeRazaoSocial}</TableCell>
              <TableCell>{cliente.nomeFantasia || '-'}</TableCell>
              <TableCell>
                {cliente.tipo.cliente && 'Cliente'}
                {cliente.tipo.cliente && cliente.tipo.mecanico && ' / '}
                {cliente.tipo.mecanico && 'Mecânico'}
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
                    {!isInactive && (
                      <DropdownMenuItem onClick={() => onEdit(cliente)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {isInactive ? (
                      <DropdownMenuItem onClick={() => onReactivate(cliente.id!)}>
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
                              Esta ação irá inativar o cliente. Ele não aparecerá
                              na lista principal, mas poderá ser reativado.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onInactivate(cliente.id!)}
                            >
                              Sim, inativar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <DropdownMenuSeparator />
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
                            Confirma a exclusão permanente?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O cliente será
                            permanentemente excluído do banco de dados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(cliente.id!)}
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
            <TableCell colSpan={4} className="h-24 text-center">
              Nenhum cliente encontrado.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

export default function ClientesPage({ isModal = false, onSaveSuccess, onCancel }: ClientePageProps) {
  const { toast } = useToast();
  const [clientesAtivos, setClientesAtivos] = React.useState<Cliente[]>([]);
  const [clientesInativos, setClientesInativos] = React.useState<Cliente[]>([]);
  
  const [editingCliente, setEditingCliente] = React.useState<Cliente | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(isModal);
  
  const [lastVisibleAtivo, setLastVisibleAtivo] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisibleAtivo, setFirstVisibleAtivo] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [currentPageAtivo, setCurrentPageAtivo] = React.useState(1);
  const [totalClientesAtivos, setTotalClientesAtivos] = React.useState(0);

  const [lastVisibleInativo, setLastVisibleInativo] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisibleInativo, setFirstVisibleInativo] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [currentPageInativo, setCurrentPageInativo] = React.useState(1);
  const [totalClientesInativos, setTotalClientesInativos] = React.useState(0);

  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nomeRazaoSocial: '',
      nomeFantasia: '',
      tipo: { cliente: true, mecanico: false },
      status: 'Ativo',
      observacao: '',
    },
  });

  const fetchClientes = React.useCallback(async (
    status: 'Ativo' | 'Inativo', 
    direction: 'next' | 'prev' | 'initial' = 'initial'
  ) => {
    try {
      const collectionRef = collection(db, 'clientes');
      const statusQuery = where('status', '==', status);

      const totalSnapshot = await getCountFromServer(query(collectionRef, statusQuery));
      if (status === 'Ativo') {
        setTotalClientesAtivos(totalSnapshot.data().count);
      } else {
        setTotalClientesInativos(totalSnapshot.data().count);
      }

      let q;
      const lastVisible = status === 'Ativo' ? lastVisibleAtivo : lastVisibleInativo;
      const firstVisible = status === 'Ativo' ? firstVisibleAtivo : firstVisibleInativo;

      if (direction === 'initial') {
         q = query(collectionRef, statusQuery, orderBy('nomeRazaoSocial'), limit(ITEMS_PER_PAGE));
      } else if (direction === 'next' && lastVisible) {
        q = query(collectionRef, statusQuery, orderBy('nomeRazaoSocial'), startAfter(lastVisible), limit(ITEMS_PER_PAGE));
      } else if (direction === 'prev' && firstVisible) {
        q = query(collectionRef, statusQuery, orderBy('nomeRazaoSocial'), endBefore(firstVisible), limitToLast(ITEMS_PER_PAGE));
      } else {
        q = query(collectionRef, statusQuery, orderBy('nomeRazaoSocial'), limit(ITEMS_PER_PAGE));
      }

      const querySnapshot = await getDocs(q);
      const clientesData = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Cliente)
      );

      if (status === 'Ativo') {
        setClientesAtivos(clientesData);
        if (querySnapshot.docs.length > 0) {
          setFirstVisibleAtivo(querySnapshot.docs[0]);
          setLastVisibleAtivo(querySnapshot.docs[querySnapshot.docs.length - 1]);
        }
      } else {
        setClientesInativos(clientesData);
         if (querySnapshot.docs.length > 0) {
          setFirstVisibleInativo(querySnapshot.docs[0]);
          setLastVisibleInativo(querySnapshot.docs[querySnapshot.docs.length - 1]);
        }
      }

    } catch (error) {
      console.error('Error fetching clientes:', error);
      toast({
        title: 'Erro ao buscar clientes',
        description: `Não foi possível carregar a lista de clientes ${status === 'Ativo' ? 'ativos' : 'inativos'}.`,
        variant: 'destructive',
      });
    }
  }, [toast, lastVisibleAtivo, firstVisibleAtivo, lastVisibleInativo, firstVisibleInativo]);

  React.useEffect(() => {
    if (!isModal) {
      fetchClientes('Ativo', 'initial');
      fetchClientes('Inativo', 'initial');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModal]);

  const handlePagination = (status: 'Ativo' | 'Inativo', direction: 'next' | 'prev') => {
    if (status === 'Ativo') {
        const newPage = direction === 'next' ? currentPageAtivo + 1 : currentPageAtivo - 1;
        setCurrentPageAtivo(newPage);
        fetchClientes(status, direction);
    } else {
        const newPage = direction === 'next' ? currentPageInativo + 1 : currentPageInativo - 1;
        setCurrentPageInativo(newPage);
        fetchClientes(status, direction);
    }
  };


  const handleFormSubmit = async (data: ClienteFormValues) => {
    try {
      if (editingCliente) {
        const clienteDocRef = doc(db, 'clientes', editingCliente.id!);
        await updateDoc(clienteDocRef, data);
        toast({
          title: 'Sucesso!',
          description: 'Cliente atualizado com sucesso.',
        });
        if (onSaveSuccess) onSaveSuccess({ value: editingCliente.id!, label: data.nomeRazaoSocial });
      } else {
        const docRef = await addDoc(collection(db, 'clientes'), data);
        toast({
          title: 'Sucesso!',
          description: 'Cliente cadastrado com sucesso.',
        });
         if (onSaveSuccess) onSaveSuccess({ value: docRef.id, label: data.nomeRazaoSocial });
      }

      if (!isModal) {
        form.reset();
        setEditingCliente(null);
        setIsFormOpen(false);
        fetchClientes('Ativo', 'initial');
        fetchClientes('Inativo', 'initial');
      }
    } catch (error) {
      console.error('Error saving cliente:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar os dados do cliente.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    form.reset(cliente);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleNew = () => {
    setEditingCliente(null);
    form.reset({
        nomeRazaoSocial: '',
        nomeFantasia: '',
        tipo: { cliente: true, mecanico: false },
        status: 'Ativo',
        observacao: '',
    });
    setIsFormOpen(true);
  }

  const handleCancel = () => {
    if (isModal && onCancel) {
        onCancel();
    } else {
        setEditingCliente(null);
        form.reset();
        setIsFormOpen(false);
    }
  };

  const handleStatusChange = async (id: string, status: 'Ativo' | 'Inativo') => {
    try {
      const clienteDocRef = doc(db, 'clientes', id);
      await updateDoc(clienteDocRef, { status });
      toast({
        title: `Cliente ${status === 'Ativo' ? 'Reativado' : 'Inativado'}`,
        description: `O cliente foi movido para ${status === 'Ativo' ? 'ativos' : 'inativos'}.`,
      });
      fetchClientes('Ativo', 'initial');
      fetchClientes('Inativo', 'initial');
      setCurrentPageAtivo(1);
      setCurrentPageInativo(1);
    } catch (error) {
      console.error(`Error ${status === 'Ativo' ? 'reactivating' : 'inactivating'} cliente:`, error);
      toast({
        title: `Erro ao ${status === 'Ativo' ? 'reativar' : 'inativar'}`,
        description: `Não foi possível ${status === 'Ativo' ? 'reativar' : 'inativar'} o cliente.`,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
     try {
      await deleteDoc(doc(db, 'clientes', id));
      toast({
        title: 'Cliente Excluído',
        description: 'O cliente foi permanentemente excluído.',
      });
      fetchClientes('Ativo', 'initial');
      fetchClientes('Inativo', 'initial');
      setCurrentPageAtivo(1);
      setCurrentPageInativo(1);
    } catch (error) {
      console.error('Error deleting cliente:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o cliente.',
        variant: 'destructive',
      });
    }
  };


  return (
    <div className={cn(!isModal && "space-y-6")}>
      {!isModal && (
        <div className="flex items-center justify-between">
            <div>
            <h1 className="text-3xl font-bold tracking-tight">
                Cadastro de Clientes/Mecânicos
            </h1>
            <p className="text-muted-foreground">
                Gerencie seus clientes e mecânicos.
            </p>
            </div>
            {!isFormOpen && (
                <Button onClick={handleNew}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Novo Cliente
                </Button>
            )}
        </div>
      )}

      {isFormOpen && (
        <Card className={cn(isModal && "border-0 shadow-none")}>
          {!isModal && (
            <CardHeader>
                <CardTitle>{editingCliente ? 'Editar Cliente' : 'Novo Cliente'}</CardTitle>
                <CardDescription>Preencha os dados do cliente.</CardDescription>
            </CardHeader>
          )}
          <CardContent className={cn(isModal && "p-0")}>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nomeRazaoSocial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome / Razão Social</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: João da Silva" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nomeFantasia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Fantasia (opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Oficina do João" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="tipo"
                  render={() => (
                    <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <div className="flex gap-4 items-center pt-2">
                           <FormField
                                control={form.control}
                                name="tipo.cliente"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Cliente</FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="tipo.mecanico"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Mecânico</FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormMessage>{form.formState.errors.tipo?.message}</FormMessage>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="observacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observação</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Alguma observação sobre o cliente..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingCliente ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {!isModal && (
        <Tabs defaultValue="ativos">
            <TabsList>
                <TabsTrigger value="ativos">Ativos</TabsTrigger>
                <TabsTrigger value="inativos">Inativos</TabsTrigger>
            </TabsList>
            <TabsContent value="ativos">
                <Card>
                    <CardHeader>
                    <CardTitle>Clientes Ativos</CardTitle>
                    <CardDescription>Lista de clientes e mecânicos ativos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ClienteTable 
                            clientes={clientesAtivos}
                            onEdit={handleEdit}
                            onInactivate={(id) => handleStatusChange(id, 'Inativo')}
                            onDelete={handleDelete}
                            onReactivate={(id) => handleStatusChange(id, 'Ativo')}
                        />
                    </CardContent>
                    <CardFooter className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                            Página {currentPageAtivo} de {Math.ceil(totalClientesAtivos / ITEMS_PER_PAGE)}
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
                                disabled={currentPageAtivo === Math.ceil(totalClientesAtivos / ITEMS_PER_PAGE)}
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
                    <CardTitle>Clientes Inativos</CardTitle>
                    <CardDescription>Lista de clientes e mecânicos inativos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ClienteTable 
                            clientes={clientesInativos}
                            onEdit={handleEdit}
                            onInactivate={(id) => handleStatusChange(id, 'Inativo')}
                            onDelete={handleDelete}
                            onReactivate={(id) => handleStatusChange(id, 'Ativo')}
                            isInactive
                        />
                    </CardContent>
                    <CardFooter className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                            Página {currentPageInativo} de {Math.ceil(totalClientesInativos / ITEMS_PER_PAGE)}
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
                                disabled={currentPageInativo === Math.ceil(totalClientesInativos / ITEMS_PER_PAGE)}
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
