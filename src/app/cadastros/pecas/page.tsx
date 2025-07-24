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

const pecaSchema = z.object({
  codigoPeca: z.string().min(1, 'Código da Peça é obrigatório.'),
  descricao: z.string().min(3, 'Descrição é obrigatória.'),
  status: z.enum(['Ativo', 'Inativo']).default('Ativo'),
  observacao: z.string().optional(),
});

type PecaFormValues = z.infer<typeof pecaSchema>;

export default function PecasPage() {
  const { toast } = useToast();
  const [pecas, setPecas] = React.useState<Peca[]>([]);
  const [editingPeca, setEditingPeca] = React.useState<Peca | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const form = useForm<PecaFormValues>({
    resolver: zodResolver(pecaSchema),
    defaultValues: {
      codigoPeca: '',
      descricao: '',
      status: 'Ativo',
      observacao: '',
    },
  });

  const fetchPecas = React.useCallback(async () => {
    try {
      const q = query(collection(db, 'pecas'), where('status', '==', 'Ativo'));
      const querySnapshot = await getDocs(q);
      const pecasData = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Peca)
      );
      setPecas(pecasData);
    } catch (error) {
      console.error('Error fetching pecas:', error);
      toast({
        title: 'Erro ao buscar peças',
        description: 'Não foi possível carregar a lista de peças.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  React.useEffect(() => {
    fetchPecas();
  }, [fetchPecas]);

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
      fetchPecas();
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

  const handleInactivate = async (id: string) => {
    try {
      const pecaDocRef = doc(db, 'pecas', id);
      await updateDoc(pecaDocRef, { status: 'Inativo' });
      toast({
        title: 'Peça Inativada',
        description: 'A peça foi movida para inativos.',
      });
      fetchPecas();
    } catch (error) {
      console.error('Error inactivating peca:', error);
      toast({
        title: 'Erro ao inativar',
        description: 'Não foi possível inativar a peça.',
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

      <Card>
        <CardHeader>
          <CardTitle>Peças Cadastradas</CardTitle>
          <CardDescription>Lista de peças ativas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código da Peça</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[80px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pecas.map((peca) => (
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
                        <DropdownMenuItem onClick={() => handleEdit(peca)}>
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
                                Esta ação irá inativar a peça. Ela não será
                                permanentemente excluída e poderá ser reativada
                                no futuro.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleInactivate(peca.id!)}>
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
          {pecas.length === 0 && (
            <div className="text-center p-4 text-muted-foreground">
              Nenhuma peça cadastrada.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
