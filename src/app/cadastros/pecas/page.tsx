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
import type { Peca } from '@/types/firestore';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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

const pecaSchema = z.object({
  codigoPeca: z.string().min(1, 'Código da Peça é obrigatório.'),
  descricao: z.string().min(3, 'Descrição é obrigatória.'),
  status: z.enum(['Ativo', 'Inativo']).default('Ativo'),
  observacao: z.string().optional(),
}).passthrough();

type PecaFormValues = z.infer<typeof pecaSchema>;

const ITEMS_PER_PAGE = 10;


function PecaTable({
  pecas,
  onEdit,
  onInactivate,
  onDelete,
  onReactivate,
  isInactive = false,
}: {
  pecas: Peca[];
  onEdit: (peca: Peca) => void;
  onInactivate: (id: string) => void;
  onDelete: (id: string) => void;
  onReactivate: (id: string) => void;
  isInactive?: boolean;
}) {

  return (
     <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código da Peça</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead className="w-[80px] text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pecas.length > 0 ? (
          pecas.map((peca) => (
            <TableRow key={peca.id}>
              <TableCell>{peca.codigoPeca}</TableCell>
              <TableCell>{peca.descricao}</TableCell>
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
                      <DropdownMenuItem onClick={() => onEdit(peca)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {isInactive ? (
                       <DropdownMenuItem onClick={() => onReactivate(peca.id!)}>
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
                              Esta ação irá inativar a peça. Ela não aparecerá
                              na lista principal, mas poderá ser reativada.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onInactivate(peca.id!)}>
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
                            Esta ação não pode ser desfeita. A peça será
                            permanentemente excluída do banco de dados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(peca.id!)} className="bg-red-600 hover:bg-red-700">
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
            <TableCell colSpan={3} className="h-24 text-center">
              Nenhuma peça encontrada.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

export default function PecasPage() {
  const { toast } = useToast();
  const [pecasAtivas, setPecasAtivas] = React.useState<Peca[]>([]);
  const [pecasInativas, setPecasInativas] = React.useState<Peca[]>([]);
  const [editingPeca, setEditingPeca] = React.useState<Peca | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const [lastVisibleAtivo, setLastVisibleAtivo] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisibleAtivo, setFirstVisibleAtivo] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [currentPageAtivo, setCurrentPageAtivo] = React.useState(1);
  const [totalPecasAtivas, setTotalPecasAtivas] = React.useState(0);

  const [lastVisibleInativo, setLastVisibleInativo] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisibleInativo, setFirstVisibleInativo] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [currentPageInativo, setCurrentPageInativo] = React.useState(1);
  const [totalPecasInativas, setTotalPecasInativas] = React.useState(0);

  const form = useForm<PecaFormValues>({
    resolver: zodResolver(pecaSchema),
    defaultValues: {
      codigoPeca: '',
      descricao: '',
      status: 'Ativo',
      observacao: '',
    },
  });

  const fetchPecas = React.useCallback(async (
    status: 'Ativo' | 'Inativo',
    direction: 'next' | 'prev' | 'initial' = 'initial'
  ) => {
    try {
       const collectionRef = collection(db, 'pecas');
      const statusQuery = where('status', '==', status);

      const totalSnapshot = await getCountFromServer(query(collectionRef, statusQuery));
      if (status === 'Ativo') {
        setTotalPecasAtivas(totalSnapshot.data().count);
      } else {
        setTotalPecasInativas(totalSnapshot.data().count);
      }
      
      let q;
      const lastVisible = status === 'Ativo' ? lastVisibleAtivo : lastVisibleInativo;
      const firstVisible = status === 'Ativo' ? firstVisibleAtivo : firstVisibleInativo;

      if (direction === 'initial') {
        q = query(collectionRef, statusQuery, orderBy('descricao'), limit(ITEMS_PER_PAGE));
      } else if (direction === 'next' && lastVisible) {
        q = query(collectionRef, statusQuery, orderBy('descricao'), startAfter(lastVisible), limit(ITEMS_PER_PAGE));
      } else if (direction === 'prev' && firstVisible) {
        q = query(collectionRef, statusQuery, orderBy('descricao'), endBefore(firstVisible), limitToLast(ITEMS_PER_PAGE));
      } else {
         q = query(collectionRef, statusQuery, orderBy('descricao'), limit(ITEMS_PER_PAGE));
      }

      const querySnapshot = await getDocs(q);
      const pecasData = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Peca)
      );
      
      if (status === 'Ativo') {
        setPecasAtivas(pecasData);
         if (querySnapshot.docs.length > 0) {
            setFirstVisibleAtivo(querySnapshot.docs[0]);
            setLastVisibleAtivo(querySnapshot.docs[querySnapshot.docs.length - 1]);
        }
      } else {
        setPecasInativas(pecasData);
        if (querySnapshot.docs.length > 0) {
            setFirstVisibleInativo(querySnapshot.docs[0]);
            setLastVisibleInativo(querySnapshot.docs[querySnapshot.docs.length - 1]);
        }
      }

    } catch (error) {
      console.error('Error fetching pecas:', error);
      toast({
        title: 'Erro ao buscar peças',
        description: `Não foi possível carregar a lista de peças ${status === 'Ativo' ? 'ativas' : 'inativas'}.`,
        variant: 'destructive',
      });
    }
  }, [toast, lastVisibleAtivo, firstVisibleAtivo, lastVisibleInativo, firstVisibleInativo]);

  React.useEffect(() => {
    fetchPecas('Ativo', 'initial');
    fetchPecas('Inativo', 'initial');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePagination = (status: 'Ativo' | 'Inativo', direction: 'next' | 'prev') => {
    if (status === 'Ativo') {
        const newPage = direction === 'next' ? currentPageAtivo + 1 : currentPageAtivo - 1;
        setCurrentPageAtivo(newPage);
        fetchPecas(status, direction);
    } else {
        const newPage = direction === 'next' ? currentPageInativo + 1 : currentPageInativo - 1;
        setCurrentPageInativo(newPage);
        fetchPecas(status, direction);
    }
  };


  const handleFormSubmit = async (data: PecaFormValues) => {
    try {
      if (editingPeca) {
        const pecaDocRef = doc(db, 'pecas', editingPeca.id!);
        await updateDoc(pecaDocRef, data);
        toast({
          title: 'Sucesso!',
          description: 'Peça atualizada com sucesso.',
        });
      } else {
        await addDoc(collection(db, 'pecas'), data);
        toast({
          title: 'Sucesso!',
          description: 'Peça cadastrada com sucesso.',
        });
      }
      form.reset();
      setEditingPeca(null);
      setIsFormOpen(false);
      fetchPecas('Ativo', 'initial');
      fetchPecas('Inativo', 'initial');
    } catch (error) {
      console.error('Error saving peca:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar os dados da peça.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (peca: Peca) => {
    setEditingPeca(peca);
    form.reset(peca);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNew = () => {
    setEditingPeca(null);
    form.reset({
      codigoPeca: '',
      descricao: '',
      status: 'Ativo',
      observacao: '',
    });
    setIsFormOpen(true);
  }

  const handleCancel = () => {
    setEditingPeca(null);
    form.reset();
    setIsFormOpen(false);
  };
  
  const handleStatusChange = async (id: string, status: 'Ativo' | 'Inativo') => {
    try {
      const pecaDocRef = doc(db, 'pecas', id);
      await updateDoc(pecaDocRef, { status });
      toast({
        title: `Peça ${status === 'Ativo' ? 'Reativada' : 'Inativada'}`,
        description: `A peça foi movida para ${status === 'Ativo' ? 'ativos' : 'inativos'}.`,
      });
      fetchPecas('Ativo', 'initial');
      fetchPecas('Inativo', 'initial');
      setCurrentPageAtivo(1);
      setCurrentPageInativo(1);
    } catch (error) {
      console.error(`Error ${status === 'Ativo' ? 'reactivating' : 'inactivating'} peca:`, error);
      toast({
        title: `Erro ao ${status === 'Ativo' ? 'reativar' : 'inativar'}`,
        description: `Não foi possível ${status === 'Ativo' ? 'reativar' : 'inativar'} a peça.`,
        variant: 'destructive',
      });
    }
  };
  
  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'pecas', id));
      toast({
        title: 'Peça Excluída',
        description: 'A peça foi permanentemente excluída.',
      });
      fetchPecas('Ativo', 'initial');
      fetchPecas('Inativo', 'initial');
      setCurrentPageAtivo(1);
      setCurrentPageInativo(1);
    } catch (error) {
      console.error('Error deleting peca:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a peça.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cadastro de Peças</h1>
            <p className="text-muted-foreground">Gerencie seu inventário de peças.</p>
          </div>
        {!isFormOpen && (
            <Button onClick={handleNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova Peça
            </Button>
        )}
      </div>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>{editingPeca ? 'Editar Peça' : 'Nova Peça'}</CardTitle>
            <CardDescription>Preencha os dados da peça.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="codigoPeca"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código da Peça</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: FRAS-LE123" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Pastilha de Freio Dianteira" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="observacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observação</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Alguma observação sobre a peça..." />
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
                    {editingPeca ? 'Salvar Alterações' : 'Cadastrar Peça'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="ativos">
        <TabsList>
            <TabsTrigger value="ativos">Ativas</TabsTrigger>
            <TabsTrigger value="inativos">Inativas</TabsTrigger>
        </TabsList>
        <TabsContent value="ativos">
            <Card>
                <CardHeader>
                <CardTitle>Peças Ativas</CardTitle>
                <CardDescription>Lista de peças ativas no inventário.</CardDescription>
                </CardHeader>
                <CardContent>
                    <PecaTable 
                        pecas={pecasAtivas}
                        onEdit={handleEdit}
                        onInactivate={(id) => handleStatusChange(id, 'Inativo')}
                        onDelete={handleDelete}
                        onReactivate={(id) => handleStatusChange(id, 'Ativo')}
                    />
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                         Página {currentPageAtivo} de {Math.ceil(totalPecasAtivas / ITEMS_PER_PAGE)}
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
                            disabled={currentPageAtivo === Math.ceil(totalPecasAtivas / ITEMS_PER_PAGE)}
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
                <CardTitle>Peças Inativas</CardTitle>
                <CardDescription>Lista de peças inativas no inventário.</CardDescription>
                </CardHeader>
                <CardContent>
                     <PecaTable 
                        pecas={pecasInativas}
                        onEdit={handleEdit}
                        onInactivate={(id) => handleStatusChange(id, 'Inativo')}
                        onDelete={handleDelete}
                        onReactivate={(id) => handleStatusChange(id, 'Ativo')}
                        isInactive
                    />
                </CardContent>
                 <CardFooter className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                        Página {currentPageInativo} de {Math.ceil(totalPecasInativas / ITEMS_PER_PAGE)}
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
                            disabled={currentPageInativo === Math.ceil(totalPecasInativas / ITEMS_PER_PAGE)}
                        >
                            Próximo
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}
