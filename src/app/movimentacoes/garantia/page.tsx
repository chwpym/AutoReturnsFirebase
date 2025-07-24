
'use client';

import * as React from 'react';
import {
  collection,
  addDoc,
  Timestamp,
  getDoc,
  doc,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MovimentacaoGarantia, Peca, Cliente, Fornecedor } from '@/types/firestore';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
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
import { Calendar as CalendarIcon, ShieldCheck, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { SearchCombobox } from '@/components/search-combobox';
import { Calendar } from '@/components/ui/calendar';

const garantiaSchema = z.object({
  pecaId: z.string().min(1, 'Busque e selecione uma peça válida.'),
  pecaCodigo: z.string().min(1, 'Código da Peça é obrigatório.'),
  pecaDescricao: z.string(),
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
  const [pecaBuscaError, setPecaBuscaError] = React.useState('');

  const form = useForm<GarantiaFormValues>({
    resolver: zodResolver(garantiaSchema),
    defaultValues: {
      pecaId: '',
      pecaCodigo: '',
      pecaDescricao: '',
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

   const handlePecaSearch = async (codigoPeca: string) => {
    if (!codigoPeca) {
      form.setValue('pecaId', '');
      form.setValue('pecaDescricao', '');
      setPecaBuscaError('');
      return;
    }

    try {
      const q = query(
        collection(db, 'pecas'),
        where('codigoPeca', '==', codigoPeca),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const pecaDoc = querySnapshot.docs[0];
        const pecaData = pecaDoc.data() as Peca;
        form.setValue('pecaId', pecaDoc.id);
        form.setValue('pecaDescricao', pecaData.descricao);
        setPecaBuscaError('');
      } else {
        form.setValue('pecaId', '');
        form.setValue('pecaDescricao', 'Peça não encontrada');
        setPecaBuscaError('Nenhuma peça encontrada com este código.');
      }
    } catch (error) {
      console.error('Error searching for peca:', error);
      setPecaBuscaError('Erro ao buscar a peça.');
      toast({
        title: 'Erro de Busca',
        description: 'Não foi possível buscar a peça.',
        variant: 'destructive',
      });
    }
  };


  const handleFormSubmit = async (data: GarantiaFormValues) => {
    try {
      const clienteDoc = await getDoc(doc(db, 'clientes', data.clienteId));
      const mecanicoDoc = await getDoc(doc(db, 'clientes', data.mecanicoId));
      const fornecedorDoc = await getDoc(doc(db, 'fornecedores', data.fornecedorId));

      if (!clienteDoc.exists() || !mecanicoDoc.exists() || !fornecedorDoc.exists()) {
        throw new Error('Cliente, mecânico ou fornecedor não encontrado.');
      }
      
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
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <FormField
                    control={form.control}
                    name="pecaCodigo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código da Peça</FormLabel>
                        <FormControl>
                           <Input 
                            {...field} 
                            placeholder="Digite o código e saia do campo"
                            onBlur={(e) => {
                                field.onBlur();
                                handlePecaSearch(e.target.value);
                            }}
                           />
                        </FormControl>
                         <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormItem>
                    <FormLabel>Descrição da Peça</FormLabel>
                     <Controller
                        control={form.control}
                        name="pecaDescricao"
                        render={({ field }) => (
                           <Input {...field} readOnly placeholder="Descrição será preenchida" />
                        )}
                    />
                    {pecaBuscaError && <p className="text-sm font-medium text-destructive">{pecaBuscaError}</p>}
                  </FormItem>
              </div>

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <div className="flex gap-2">
                        <FormField
                        control={form.control}
                        name="clienteId"
                        render={({ field }) => (
                            <SearchCombobox
                                collectionName="clientes"
                                labelField="nomeRazaoSocial"
                                searchField="nomeRazaoSocial"
                                placeholder="Selecione o cliente"
                                emptyMessage="Nenhum cliente encontrado."
                                value={field.value}
                                onChange={field.onChange}
                                className="w-full"
                            />
                        )}
                        />
                         <Button type="button" size="icon" variant="outline"><PlusCircle className="h-4 w-4" /></Button>
                    </div>
                     <FormMessage>{form.formState.errors.clienteId?.message}</FormMessage>
                 </FormItem>
                 <FormItem>
                    <FormLabel>Mecânico</FormLabel>
                     <div className="flex gap-2">
                        <FormField
                        control={form.control}
                        name="mecanicoId"
                        render={({ field }) => (
                            <SearchCombobox
                                collectionName="clientes"
                                labelField="nomeRazaoSocial"
                                searchField="nomeRazaoSocial"
                                placeholder="Selecione o mecânico"
                                emptyMessage="Nenhum mecânico encontrado."
                                value={field.value}
                                onChange={field.onChange}
                                className="w-full"
                            />
                        )}
                        />
                         <Button type="button" size="icon" variant="outline"><PlusCircle className="h-4 w-4" /></Button>
                    </div>
                    <FormMessage>{form.formState.errors.mecanicoId?.message}</FormMessage>
                 </FormItem>
              </div>
              
              <FormItem>
                <FormLabel>Fornecedor</FormLabel>
                 <div className="flex gap-2">
                    <FormField
                        control={form.control}
                        name="fornecedorId"
                        render={({ field }) => (
                            <SearchCombobox
                                collectionName="fornecedores"
                                labelField="razaoSocial"
                                searchField="razaoSocial"
                                placeholder="Selecione o fornecedor"
                                emptyMessage="Nenhum fornecedor encontrado."
                                value={field.value}
                                onChange={field.onChange}
                                className="w-full"
                            />
                        )}
                        />
                    <Button type="button" size="icon" variant="outline"><PlusCircle className="h-4 w-4" /></Button>
                </div>
                <FormMessage>{form.formState.errors.fornecedorId?.message}</FormMessage>
              </FormItem>

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
