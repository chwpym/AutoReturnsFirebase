'use client';

import * as React from 'react';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Fornecedor } from '@/types/firestore';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
} from '@/components/ui/dropdown-menu';
import { Edit, MoreHorizontal, PlusCircle, Trash } from 'lucide-react';
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

const fornecedorSchema = z.object({
  razaoSocial: z.string().min(3, 'Razão Social é obrigatória.'),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().min(14, 'CNPJ inválido').max(18, 'CNPJ inválido'),
  status: z.enum(['Ativo', 'Inativo']).default('Ativo'),
  observacao: z.string().optional(),
});

type FornecedorFormValues = z.infer<typeof fornecedorSchema>;

export default function FornecedoresPage() {
  const { toast } = useToast();
  const [fornecedores, setFornecedores] = React.useState<Fornecedor[]>([]);
  const [editingFornecedor, setEditingFornecedor] = React.useState<Fornecedor | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const form = useForm<FornecedorFormValues>({
    resolver: zodResolver(fornecedorSchema),
    defaultValues: {
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      status: 'Ativo',
      observacao: '',
    },
  });

  const fetchFornecedores = React.useCallback(async () => {
    try {
      const q = query(collection(db, 'fornecedores'), where('status', '==', 'Ativo'));
      const querySnapshot = await getDocs(q);
      const fornecedoresData = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Fornecedor)
      );
      setFornecedores(fornecedoresData);
    } catch (error) {
      console.error('Error fetching fornecedores:', error);
      toast({
        title: 'Erro ao buscar fornecedores',
        description: 'Não foi possível carregar a lista de fornecedores.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  React.useEffect(() => {
    fetchFornecedores();
  }, [fetchFornecedores]);

  const handleFormSubmit = async (data: FornecedorFormValues) => {
    try {
      if (editingFornecedor) {
        const fornecedorDocRef = doc(db, 'fornecedores', editingFornecedor.id!);
        await updateDoc(fornecedorDocRef, data);
        toast({
          title: 'Sucesso!',
          description: 'Fornecedor atualizado com sucesso.',
        });
      } else {
        await addDoc(collection(db, 'fornecedores'), data);
        toast({
          title: 'Sucesso!',
          description: 'Fornecedor cadastrado com sucesso.',
        });
      }
      form.reset();
      setEditingFornecedor(null);
      setIsFormOpen(false);
      fetchFornecedores();
    } catch (error) {
      console.error('Error saving fornecedor:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar os dados do fornecedor.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (fornecedor: Fornecedor) => {
    setEditingFornecedor(fornecedor);
    form.reset(fornecedor);
    setIsFormOpen(true);
  };
  
  const handleNew = () => {
    setEditingFornecedor(null);
    form.reset({
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      status: 'Ativo',
      observacao: '',
    });
    setIsFormOpen(true);
  }

  const handleCancel = () => {
    setEditingFornecedor(null);
    form.reset();
    setIsFormOpen(false);
  };

  const handleInactivate = async (id: string) => {
    try {
      const fornecedorDocRef = doc(db, 'fornecedores', id);
      await updateDoc(fornecedorDocRef, { status: 'Inativo' });
      toast({
        title: 'Fornecedor Inativado',
        description: 'O fornecedor foi movido para inativos.',
      });
      fetchFornecedores();
    } catch (error) {
      console.error('Error inactivating fornecedor:', error);
      toast({
        title: 'Erro ao inativar',
        description: 'Não foi possível inativar o fornecedor.',
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
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="razaoSocial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Razão Social</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Fornecedor Peças LTDA" />
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
                          <Input {...field} placeholder="Ex: Peças Rápidas" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="00.000.000/0000-00" />
                      </FormControl>
                      <FormMessage />
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
                        <Textarea {...field} placeholder="Alguma observação sobre o fornecedor..." />
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
                    {editingFornecedor ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Fornecedores Cadastrados</CardTitle>
          <CardDescription>Lista de fornecedores ativos.</CardDescription>
        </CardHeader>
        <CardContent>
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
              {fornecedores.map((fornecedor) => (
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
                        <DropdownMenuItem onClick={() => handleEdit(fornecedor)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                         <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Trash className="mr-2 h-4 w-4" />
                              Inativar
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação irá inativar o fornecedor. Ele não será
                                permanentemente excluído e poderá ser reativado
                                no futuro.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleInactivate(fornecedor.id!)}>
                                Sim, inativar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {fornecedores.length === 0 && (
            <div className="text-center p-4 text-muted-foreground">
              Nenhum fornecedor cadastrado.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
