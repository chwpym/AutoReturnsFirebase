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

const clienteSchema = z.object({
  nomeRazaoSocial: z.string().min(3, 'Nome/Razão Social é obrigatório.'),
  nomeFantasia: z.string().optional(),
  tipo: z.object({
    cliente: z.boolean().default(false),
    mecanico: z.boolean().default(false),
  }).refine((data) => data.cliente || data.mecanico, {
    message: 'Selecione pelo menos um tipo.',
  }),
  status: z.enum(['Ativo', 'Inativo']).default('Ativo'),
  observacao: z.string().optional(),
});

type ClienteFormValues = z.infer<typeof clienteSchema>;

export default function ClientesPage() {
  const { toast } = useToast();
  const [clientes, setClientes] = React.useState<Cliente[]>([]);
  const [editingCliente, setEditingCliente] = React.useState<Cliente | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);

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

  const fetchClientes = React.useCallback(async () => {
    try {
      const q = query(collection(db, 'clientes'), where('status', '==', 'Ativo'));
      const querySnapshot = await getDocs(q);
      const clientesData = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Cliente)
      );
      setClientes(clientesData);
    } catch (error) {
      console.error('Error fetching clientes:', error);
      toast({
        title: 'Erro ao buscar clientes',
        description: 'Não foi possível carregar a lista de clientes.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  React.useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const handleFormSubmit = async (data: ClienteFormValues) => {
    try {
      if (editingCliente) {
        const clienteDocRef = doc(db, 'clientes', editingCliente.id!);
        await updateDoc(clienteDocRef, data);
        toast({
          title: 'Sucesso!',
          description: 'Cliente atualizado com sucesso.',
        });
      } else {
        await addDoc(collection(db, 'clientes'), data);
        toast({
          title: 'Sucesso!',
          description: 'Cliente cadastrado com sucesso.',
        });
      }
      form.reset();
      setEditingCliente(null);
      setIsFormOpen(false);
      fetchClientes();
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
    setEditingCliente(null);
    form.reset();
    setIsFormOpen(false);
  };


  const handleInactivate = async (id: string) => {
    try {
      const clienteDocRef = doc(db, 'clientes', id);
      await updateDoc(clienteDocRef, { status: 'Inativo' });
      toast({
        title: 'Cliente Inativado',
        description: 'O cliente foi movido para inativos.',
      });
      fetchClientes();
    } catch (error) {
      console.error('Error inactivating cliente:', error);
      toast({
        title: 'Erro ao inativar',
        description: 'Não foi possível inativar o cliente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
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

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>{editingCliente ? 'Editar Cliente' : 'Novo Cliente'}</CardTitle>
            <CardDescription>Preencha os dados do cliente.</CardDescription>
          </CardHeader>
          <CardContent>
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

      <Card>
        <CardHeader>
          <CardTitle>Clientes Cadastrados</CardTitle>
          <CardDescription>Lista de clientes e mecânicos ativos.</CardDescription>
        </CardHeader>
        <CardContent>
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
              {clientes.map((cliente) => (
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
                        <DropdownMenuItem onClick={() => handleEdit(cliente)}>
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
                                Esta ação irá inativar o cliente. Ele não será
                                permanentemente excluído e poderá ser reativado
                                no futuro.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleInactivate(cliente.id!)}>
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
           {clientes.length === 0 && (
            <div className="text-center p-4 text-muted-foreground">
              Nenhum cliente cadastrado.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
