
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
import { Calendar as CalendarIcon, Undo2, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { SearchCombobox } from '@/components/search-combobox';
import { QuickAddModal } from '@/components/quick-add-modal';
import ClientesPage from '@/app/cadastros/clientes/page';
import PecasPage from '@/app/cadastros/pecas/page';

const devolucaoSchema = z.object({
  pecaId: z.string().min(1, 'Busque e selecione uma peça válida.'),
  pecaCodigo: z.string().min(1, 'Código da Peça é obrigatório.'),
  pecaDescricao: z.string(),
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

export default function DevolucaoPage(props:any) {
  const { toast } = useToast();
  const [pecaBuscaError, setPecaBuscaError] = React.useState('');
  const [pecaNaoEncontrada, setPecaNaoEncontrada] = React.useState(false);
  
  const [clienteKey, setClienteKey] = React.useState(Date.now());
  const [mecanicoKey, setMecanicoKey] = React.useState(Date.now());

  const form = useForm<DevolucaoFormValues>({
    resolver: zodResolver(devolucaoSchema),
    defaultValues: {
      pecaId: '',
      pecaCodigo: '',
      pecaDescricao: '',
      quantidade: 1,
      clienteId: '',
      mecanicoId: '',
      requisicaoVenda: '',
      observacao: '',
    },
  });

  const handlePecaSearch = async (codigoPeca: string) => {
    setPecaNaoEncontrada(false);
    setPecaBuscaError('');
    form.setValue('pecaId', '');
    form.setValue('pecaDescricao', '');
    
    if (!codigoPeca) {
      return;
    }

    try {
      const q = query(
        collection(db, 'pecas'),
        where('codigoPeca', '==', codigoPeca),
        where('status', '==', 'Ativo'),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const pecaDoc = querySnapshot.docs[0];
        const pecaData = pecaDoc.data() as Peca;
        form.setValue('pecaId', pecaDoc.id, { shouldValidate: true });
        form.setValue('pecaDescricao', pecaData.descricao);
        setPecaNaoEncontrada(false);
        setPecaBuscaError('');
      } else {
        form.setValue('pecaDescricao', 'Peça não encontrada');
        setPecaBuscaError('Peça não encontrada. Clique no + para cadastrar.');
        setPecaNaoEncontrada(true);
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


  const handleFormSubmit = async (data: DevolucaoFormValues) => {
    try {
      const clienteDoc = await getDoc(doc(db, 'clientes', data.clienteId));
      const mecanicoDoc = await getDoc(doc(db, 'clientes', data.mecanicoId));

      if (!clienteDoc.exists() || !mecanicoDoc.exists()) {
        throw new Error('Cliente ou mecânico não encontrado.');
      }
      
      const clienteData = clienteDoc.data() as Cliente;
      const mecanicoData = mecanicoDoc.data() as Cliente;

      const devolucaoData: Omit<MovimentacaoDevolucao, 'id'> = {
        pecaId: data.pecaId,
        pecaCodigo: data.pecaCodigo,
        pecaDescricao: data.pecaDescricao,
        quantidade: data.quantidade,
        clienteId: data.clienteId,
        clienteNome: clienteData.nomeRazaoSocial,
        mecanicoId: data.mecanicoId,
        mecanicoNome: mecanicoData.nomeRazaoSocial,
        dataVenda: Timestamp.fromDate(data.dataVenda),
        requisicaoVenda: data.requisicaoVenda,
        acaoRequisicao: data.acaoRequisicao,
        observacao: data.observacao,
        tipoMovimentacao: 'Devolução',
        dataMovimentacao: Timestamp.now(),
      };

      await addDoc(collection(db, 'movimentacoes'), devolucaoData);
      
      toast({
        title: 'Sucesso!',
        description: 'Devolução registrada com sucesso.',
      });
      form.reset({
        pecaId: '',
        pecaCodigo: '',
        pecaDescricao: '',
        quantidade: 1,
        clienteId: '',
        mecanicoId: '',
        requisicaoVenda: '',
        observacao: '',
      });
      setClienteKey(Date.now());
      setMecanicoKey(Date.now());

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
              <div className="flex items-end gap-2">
                <div className="flex-grow-[3] basis-0">
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
                </div>

                <QuickAddModal
                  trigger={
                    <Button type="button" size="icon" variant="outline" disabled={!pecaNaoEncontrada}>
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  }
                  title="Cadastrar Nova Peça"
                  description="A peça não foi encontrada. Cadastre-a rapidamente aqui."
                  formComponent={PecasPage}
                  formProps={{
                    initialValues: { codigoPeca: form.watch('pecaCodigo') },
                  }}
                  onSaveSuccess={() => {
                    handlePecaSearch(form.watch('pecaCodigo'));
                  }}
                />

                <div className="flex-grow-[7] basis-0">
                  <FormItem>
                    <FormLabel>Descrição da Peça</FormLabel>
                    <FormControl>
                      <Input
                        readOnly
                        {...form.register('pecaDescricao')}
                        placeholder="Descrição será preenchida automaticamente"
                      />
                    </FormControl>
                    {pecaBuscaError && (
                      <p className="text-sm font-medium text-destructive">
                        {pecaBuscaError}
                      </p>
                    )}
                  </FormItem>
                </div>
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
                  <div className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name="clienteId"
                      render={({ field }) => (
                        <SearchCombobox
                          key={clienteKey}
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
                    <QuickAddModal
                      trigger={
                        <Button type="button" size="icon" variant="outline">
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                      }
                      title="Novo Cliente"
                      description="Cadastre um novo cliente ou mecânico rapidamente."
                      formComponent={ClientesPage}
                      onSaveSuccess={(newItem) => {
                        setClienteKey(Date.now());
                        form.setValue('clienteId', newItem.value, {
                          shouldValidate: true,
                        });
                      }}
                    />
                  </div>
                  <FormMessage>
                    {form.formState.errors.clienteId?.message}
                  </FormMessage>
                </FormItem>

                <FormItem>
                  <FormLabel>Mecânico</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name="mecanicoId"
                      render={({ field }) => (
                        <SearchCombobox
                          key={mecanicoKey}
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
                    <QuickAddModal
                      trigger={
                        <Button type="button" size="icon" variant="outline">
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                      }
                      title="Novo Mecânico"
                      description="Cadastre um novo cliente ou mecânico rapidamente."
                      formComponent={ClientesPage}
                      onSaveSuccess={(newItem) => {
                        setMecanicoKey(Date.now());
                        form.setValue('mecanicoId', newItem.value, {
                          shouldValidate: true,
                        });
                      }}
                    />
                  </div>
                  <FormMessage>
                    {form.formState.errors.mecanicoId?.message}
                  </FormMessage>
                </FormItem>
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset({
                      pecaId: '',
                      pecaCodigo: '',
                      pecaDescricao: '',
                      quantidade: 1,
                      clienteId: '',
                      mecanicoId: '',
                      requisicaoVenda: '',
                      observacao: '',
                    });
                    setClienteKey(Date.now());
                    setMecanicoKey(Date.now());
                  }}
                >
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

    