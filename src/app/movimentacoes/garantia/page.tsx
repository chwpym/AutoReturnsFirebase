
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
import type { MovimentacaoGarantia, Peca, Cliente, Fornecedor } from '@/types/firestore';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarIcon, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { SearchCombobox } from '@/components/search-combobox';
import { Calendar } from '@/components/ui/calendar';

const garantiaSchema = z.object({
  pecaId: z.string().min(1, 'Selecione uma peça.'),
  quantidade: z.coerce.number().min(1, 'Quantidade deve ser maior que zero.'),
  clienteId: z.string().min(1, 'Selecione um cliente.'),
  mecanicoId: z.string().min(1, 'Selecione um mecânico.'),
  fornecedorId: z.string().min(1, 'Selecione um fornecedor.'),
  dataVenda: z.date({ required_error: 'Data da venda é obrigatória.' }),
  requisicaoVenda: z.string().min(1, 'Requisição de venda é obrigatória.'),
  defeitoRelatado: z.string().min(10, 'Descreva o defeito com mais detalhes.'),
  nfSaida: z.string().min(1, 'NF de Saída é obrigatória.'),
  nfCompra: z.string().min(1, 'NF de Compra é obrigatória.'),
  valorPeca: z.coerce.number().min(0.01, 'O valor da peça é obrigatório.'),
  observacao: z.string().optional(),
});

type GarantiaFormValues = z.infer<typeof garantiaSchema>;

export default function GarantiaPage() {
  const { toast } = useToast();

  const form = useForm<GarantiaFormValues>({
    resolver: zodResolver(garantiaSchema),
    defaultValues: {
      pecaId: '',
      quantidade: 1,
      clienteId: '',
      mecanicoId: '',
      fornecedorId: '',
      requisicaoVenda: '',
      defeitoRelatado: '',
      nfSaida: '',
      nfCompra: '',
      valorPeca: 0,
      observacao: '',
    },
  });

  const handleFormSubmit = async (data: GarantiaFormValues) => {
    try {
      // Fetch descriptions to store denormalized data
      const pecaDoc = await getDoc(doc(db, 'pecas', data.pecaId));
      const clienteDoc = await getDoc(doc(db, 'clientes', data.clienteId));
      const mecanicoDoc = await getDoc(doc(db, 'clientes', data.mecanicoId));
      const fornecedorDoc = await getDoc(doc(db, 'fornecedores', data.fornecedorId));

      if (!pecaDoc.exists() || !clienteDoc.exists() || !mecanicoDoc.exists() || !fornecedorDoc.exists()) {
        throw new Error('Peça, cliente, mecânico ou fornecedor não encontrado.');
      }
      
      const pecaData = pecaDoc.data() as Peca;
      const clienteData = clienteDoc.data() as Cliente;
      const mecanicoData = mecanicoDoc.data() as Cliente;
      const fornecedorData = fornecedorDoc.data() as Fornecedor;

      const garantiaData: Omit<MovimentacaoGarantia, 'id'> = {
        ...data,
        tipoMovimentacao: 'Garantia',
        dataMovimentacao: Timestamp.now(),
        dataVenda: Timestamp.fromDate(data.dataVenda),
        acaoRetorno: 'Pendente',
        nfRetorno: '', // Starts empty
        pecaDescricao: pecaData.descricao,
        clienteNome: clienteData.nomeRazaoSocial,
        mecanicoNome: mecanicoData.nomeRazaoSocial,
        fornecedorNome: fornecedorData.razaoSocial,
      };

      await addDoc(collection(db, 'movimentacoes'), garantiaData);
      
      toast({
        title: 'Sucesso!',
        description: 'Solicitação de garantia registrada com sucesso.',
      });
      form.reset();
    } catch (error) {
      console.error('Error saving garantia:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível registrar a solicitação de garantia.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Registrar Solicitação de Garantia
          </h1>
          <p className="text-muted-foreground">
            Preencha os detalhes para abrir uma nova solicitação de garantia.
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados da Garantia</CardTitle>
          <CardDescription>
            Informações sobre a peça, cliente, venda e defeito.
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
                        collectionName="clientes"
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
              
              <FormField
                  control={form.control}
                  name="fornecedorId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fornecedor</FormLabel>
                      <SearchCombobox
                        collectionName="fornecedores"
                        labelField="razaoSocial"
                        searchField="razaoSocial"
                        placeholder="Selecione o fornecedor"
                        emptyMessage="Nenhum fornecedor encontrado."
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
              
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <FormField
                  control={form.control}
                  name="nfSaida"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NF de Saída</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nfCompra"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NF de Compra</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="valorPeca"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor da Peça (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
               </div>

              <FormField
                control={form.control}
                name="defeitoRelatado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Defeito Relatado</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Descreva detalhadamente o defeito apresentado pela peça..."
                      />
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
                      <Textarea
                        {...field}
                        placeholder="Alguma observação adicional sobre a garantia..."
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
                <Button type="submit">Registrar Garantia</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
