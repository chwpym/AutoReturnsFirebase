
'use client';

import * as React from 'react';
import {
  collection,
  addDoc,
  Timestamp,
  getDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MovimentacaoDevolucao, Peca, Cliente } from '@/types/firestore';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarIcon, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { SearchCombobox } from '@/components/search-combobox';

const devolucaoSchema = z.object({
  pecaId: z.string().min(1, 'Selecione uma peça.'),
  quantidade: z.coerce.number().min(1, 'Quantidade deve ser maior que zero.'),
  clienteId: z.string().min(1, 'Selecione um cliente.'),
  mecanicoId: z.string().min(1, 'Selecione um mecânico.'),
  dataVenda: z.date({ required_error: 'Data da venda é obrigatória.' }),
  requisicaoVenda: z.string().min(1, 'Requisição de venda é obrigatória.'),
  acaoRequisicao: z.enum(['Alterada', 'Excluída'], {
    required_error: 'Selecione uma ação.',
  }),
  observacao: z.string().optional(),
});

type DevolucaoFormValues = z.infer<typeof devolucaoSchema>;

export default function DevolucaoPage() {
  const { toast } = useToast();

  const form = useForm<DevolucaoFormValues>({
    resolver: zodResolver(devolucaoSchema),
    defaultValues: {
      pecaId: '',
      quantidade: 1,
      clienteId: '',
      mecanicoId: '',
      requisicaoVenda: '',
      observacao: '',
    },
  });

  const handleFormSubmit = async (data: DevolucaoFormValues) => {
    try {
      // Fetch descriptions to store denormalized data
      const pecaDoc = await getDoc(doc(db, 'pecas', data.pecaId));
      const clienteDoc = await getDoc(doc(db, 'clientes', data.clienteId));
      const mecanicoDoc = await getDoc(doc(db, 'clientes', data.mecanicoId));

      if (!pecaDoc.exists() || !clienteDoc.exists() || !mecanicoDoc.exists()) {
        throw new Error('Peça, cliente ou mecânico não encontrado.');
      }
      
      const pecaData = pecaDoc.data() as Peca;
      const clienteData = clienteDoc.data() as Cliente;
      const mecanicoData = mecanicoDoc.data() as Cliente;

      const devolucaoData: Omit<MovimentacaoDevolucao, 'id'> = {
        ...data,
        tipoMovimentacao: 'Devolução',
        dataMovimentacao: Timestamp.now(),
        dataVenda: Timestamp.fromDate(data.dataVenda),
        pecaDescricao: pecaData.descricao,
        clienteNome: clienteData.nomeRazaoSocial,
        mecanicoNome: mecanicoData.nomeRazaoSocial,
      };

      await addDoc(collection(db, 'movimentacoes'), devolucaoData);
      
      toast({
        title: 'Sucesso!',
        description: 'Devolução registrada com sucesso.',
      });
      form.reset();
    } catch (error) {
      console.error('Error saving devolucao:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível registrar a devolução.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Undo2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Registrar Devolução de Peça
          </h1>
          <p className="text-muted-foreground">
            Preencha os detalhes para registrar uma nova devolução.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da Devolução</CardTitle>
          <CardDescription>
            Informações sobre a peça, cliente e venda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleFormSubmit)}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="pecaId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Peça</FormLabel>
                      <SearchCombobox
                        collectionName="pecas"
                        labelField="descricao"
                        searchField="descricao"
                        placeholder="Selecione a peça"
                        emptyMessage="Nenhuma peça encontrada."
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                  control={form.control}
                  name="clienteId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Cliente</FormLabel>
                      <SearchCombobox
                        collectionName="clientes"
                        labelField="nomeRazaoSocial"
                        searchField="nomeRazaoSocial"
                        placeholder="Selecione o cliente"
                        emptyMessage="Nenhum cliente encontrado."
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mecanicoId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Mecânico</FormLabel>
                      <SearchCombobox
                        collectionName="clientes" // Reusing clientes collection
                        labelField="nomeRazaoSocial"
                        searchField="nomeRazaoSocial"
                        placeholder="Selecione o mecânico"
                        emptyMessage="Nenhum mecânico encontrado."
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                  control={form.control}
                  name="dataVenda"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data da Venda</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'dd/MM/yyyy')
                              ) : (
                                <span>Escolha uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date('1900-01-01')
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="requisicaoVenda"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requisição de Venda</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
                
              <FormField
                control={form.control}
                name="acaoRequisicao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ação na Requisição de Venda</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a ação realizada" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Alterada">Alterada</SelectItem>
                        <SelectItem value="Excluída">Excluída</SelectItem>
                      </SelectContent>
                    </Select>
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
                      <Textarea
                        {...field}
                        placeholder="Alguma observação sobre a devolução..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => form.reset()}>
                  Cancelar
                </Button>
                <Button type="submit">Registrar Devolução</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
