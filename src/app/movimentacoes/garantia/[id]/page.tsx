
'use client';

import * as React from 'react';
import { collection, addDoc, Timestamp, getDoc, doc, query, where, getDocs, limit, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MovimentacaoGarantia, Peca, Cliente, Fornecedor } from '@/types/firestore';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, ShieldCheck, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { SearchCombobox } from '@/components/search-combobox';
import { Calendar } from '@/components/ui/calendar';
import { QuickAddModal } from '@/components/quick-add-modal';
import { ClienteForm } from '@/app/cadastros/clientes/ClienteForm';
import { FornecedorForm } from '@/app/cadastros/fornecedores/FornecedorForm';
import { PecaForm } from '@/app/cadastros/pecas/PecaForm';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, useParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const garantiaSchema = z.object({
  pecaId: z.string().min(1, 'Busque e selecione uma peça válida.'),
  pecaCodigo: z.string().min(1, 'Código da Peça é obrigatório.'),
  pecaDescricao: z.string(),
  quantidade: z.coerce.number().min(1, 'Quantidade deve ser maior que zero.'),
  clienteId: z.string().min(1, 'Selecione um cliente.'),
  mecanicoId: z.string().min(1, 'Selecione um mecânico.'),
  fornecedorId: z.string().min(1, 'Selecione um fornecedor.'),
  dataVenda: z.date({ required_error: 'Data da venda é obrigatória.' }),
  requisicaoVenda: z.string().optional(),
  requisicaoGarantia: z.string().optional(),
  defeitoRelatado: z.string().min(10, 'Descreva o defeito com mais detalhes.'),
  nfSaida: z.string().optional(),
  nfCompra: z.string().optional(),
  valorPeca: z.coerce.number().optional(),
  observacao: z.string().optional(),
  acaoRetorno: z.enum(['Pendente', 'Aprovada', 'Recusada']).default('Pendente'),
  nfRetorno: z.string().optional(),
});

type GarantiaFormValues = z.infer<typeof garantiaSchema>;

interface GarantiaFormProps {
    movimentacaoId?: string;
    onSaveSuccess?: () => void;
    onCancel?: () => void;
}

export function GarantiaForm({ movimentacaoId, onSaveSuccess, onCancel }: GarantiaFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [pecaBuscaError, setPecaBuscaError] = React.useState('');
  const [pecaNaoEncontrada, setPecaNaoEncontrada] = React.useState(false);
  const [loading, setLoading] = React.useState(!!movimentacaoId);

  const [clienteKey, setClienteKey] = React.useState<number | null>(null);
  const [mecanicoKey, setMecanicoKey] = React.useState<number | null>(null);
  const [fornecedorKey, setFornecedorKey] = React.useState<number | null>(null);
  const isEditMode = !!movimentacaoId;
  const isModal = !!onCancel;

  React.useEffect(() => {
    if (!clienteKey) setClienteKey(Date.now());
    if (!mecanicoKey) setMecanicoKey(Date.now() + 1);
    if (!fornecedorKey) setFornecedorKey(Date.now() + 2);
  }, [clienteKey, mecanicoKey, fornecedorKey]);

  const form = useForm<GarantiaFormValues>({
    resolver: zodResolver(garantiaSchema),
    defaultValues: {
      pecaId: '', pecaCodigo: '', pecaDescricao: '', quantidade: 1, clienteId: '', mecanicoId: '', fornecedorId: '',
      requisicaoVenda: '', requisicaoGarantia: '', defeitoRelatado: '', nfSaida: '', nfCompra: '',
      valorPeca: undefined, observacao: '', acaoRetorno: 'Pendente', nfRetorno: '',
    },
  });

  React.useEffect(() => {
    if (movimentacaoId) {
      const fetchMovimentacao = async () => {
        setLoading(true);
        try {
          const docRef = doc(db, 'movimentacoes', movimentacaoId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as MovimentacaoGarantia;
            form.reset({
              ...data,
              dataVenda: data.dataVenda.toDate(),
              valorPeca: data.valorPeca || undefined
            });
          } else {
            toast({ title: "Erro", description: "Registro de garantia não encontrado.", variant: "destructive" });
          }
        } catch (error) {
          toast({ title: "Erro", description: "Falha ao buscar dados da garantia.", variant: "destructive" });
        } finally {
          setLoading(false);
        }
      };
      fetchMovimentacao();
    }
  }, [movimentacaoId, form, toast]);

  const handlePecaSearch = async (codigoPeca: string) => {
    setPecaNaoEncontrada(false);
    setPecaBuscaError('');
    form.setValue('pecaId', '');
    form.setValue('pecaDescricao', '');
    if (!codigoPeca) return;
    try {
      const q = query(collection(db, 'pecas'), where('codigoPeca', '==', codigoPeca), where('status', '==', 'Ativo'), limit(1));
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
      toast({ title: 'Erro de Busca', description: 'Não foi possível buscar a peça.', variant: 'destructive' });
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

      const garantiaPayload = {
        ...data,
        clienteNome: clienteData.nomeRazaoSocial,
        mecanicoNome: mecanicoData.nomeRazaoSocial,
        fornecedorNome: fornecedorData.razaoSocial,
        dataVenda: Timestamp.fromDate(data.dataVenda),
        tipoMovimentacao: 'Garantia' as const,
        valorPeca: data.valorPeca || 0,
        requisicaoVenda: data.requisicaoVenda || '',
        requisicaoGarantia: data.requisicaoGarantia || '',
        nfSaida: data.nfSaida || '',
        nfCompra: data.nfCompra || '',
        nfRetorno: data.nfRetorno || '',
        observacao: data.observacao || '',
      };

      if (isEditMode) {
        const docRef = doc(db, 'movimentacoes', movimentacaoId!);
        await updateDoc(docRef, garantiaPayload);
        toast({ title: 'Sucesso!', description: 'Garantia atualizada com sucesso.' });
        if (onSaveSuccess) onSaveSuccess();
        else router.push('/consultas');
      } else {
         await addDoc(collection(db, 'movimentacoes'), {
            ...garantiaPayload,
            dataMovimentacao: Timestamp.now(),
         });
         toast({ title: 'Sucesso!', description: 'Solicitação de garantia registrada com sucesso.' });
         form.reset();
         setClienteKey(Date.now());
         setMecanicoKey(Date.now() + 1);
         setFornecedorKey(Date.now() + 2);
      }
    } catch (error) {
      console.error('Error saving garantia:', error);
      toast({ title: 'Erro ao salvar', description: 'Não foi possível salvar a solicitação de garantia.', variant: 'destructive' });
    }
  };
  
  if (loading) {
      return (
          <div className="space-y-6 p-4">
             <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
             <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
             <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
          </div>
      )
  }

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="flex items-end gap-2">
          <div className="w-1/3">
            <FormField control={form.control} name="pecaCodigo" render={({ field }) => (
              <FormItem>
                <FormLabel>Código da Peça</FormLabel>
                <FormControl><Input {...field} placeholder="Digite o código" onBlur={(e) => { field.onBlur(); handlePecaSearch(e.target.value); }} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <QuickAddModal
            trigger={<Button type="button" size="icon" variant="outline" disabled={!pecaNaoEncontrada}><PlusCircle className="h-4 w-4" /></Button>}
            title="Cadastrar Nova Peça" description="A peça não foi encontrada. Cadastre-a rapidamente aqui."
            formComponent={PecaForm}
            formProps={{ isModal: true, initialValues: { codigoPeca: form.watch('pecaCodigo') } }}
            onSaveSuccess={() => { handlePecaSearch(form.watch('pecaCodigo')); }}
          />
          <div className="flex-1">
            <FormItem>
              <FormLabel>Descrição da Peça</FormLabel>
              <FormControl><Input readOnly {...form.register('pecaDescricao')} placeholder="Preenchido automaticamente" /></FormControl>
              {pecaBuscaError && !form.formState.errors.pecaId && (<p className="text-sm font-medium text-destructive">{pecaBuscaError}</p>)}
              <FormMessage>{form.formState.errors.pecaId?.message}</FormMessage>
            </FormItem>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="quantidade" render={({ field }) => ( <FormItem><FormLabel>Quantidade</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="dataVenda" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Data da Venda</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>{field.value ? format(field.value, 'dd/MM/yyyy') : <span>Escolha uma data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date('1900-01-01')} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormItem>
              <FormLabel>Cliente</FormLabel>
              <div className="flex items-center gap-2">
                <FormField control={form.control} name="clienteId" render={({ field }) => (<SearchCombobox key={clienteKey} collectionName="clientes" labelField="nomeRazaoSocial" searchField="nomeRazaoSocial" placeholder="Selecione o cliente" emptyMessage="Nenhum cliente encontrado." value={field.value} onChange={field.onChange} className="w-full" /> )} />
                <QuickAddModal trigger={<Button type="button" size="icon" variant="outline"><PlusCircle className="h-4 w-4" /></Button>} title="Novo Cliente" description="Cadastre um novo cliente ou mecânico rapidamente." formComponent={ClienteForm} formProps={{ isModal: true }} onSaveSuccess={(newItem) => { setClienteKey(Date.now()); form.setValue('clienteId', newItem.value, { shouldValidate: true }); }} />
              </div>
              <FormMessage>{form.formState.errors.clienteId?.message}</FormMessage>
            </FormItem>
            <FormItem>
              <FormLabel>Mecânico</FormLabel>
              <div className="flex items-center gap-2">
                <FormField control={form.control} name="mecanicoId" render={({ field }) => ( <SearchCombobox key={mecanicoKey} collectionName="clientes" labelField="nomeRazaoSocial" searchField="nomeRazaoSocial" placeholder="Selecione o mecânico" emptyMessage="Nenhum mecânico encontrado." value={field.value} onChange={field.onChange} className="w-full" /> )} />
                <QuickAddModal trigger={<Button type="button" size="icon" variant="outline"><PlusCircle className="h-4 w-4" /></Button>} title="Novo Mecânico" description="Cadastre um novo cliente ou mecânico rapidamente." formComponent={ClienteForm} formProps={{ isModal: true }} onSaveSuccess={(newItem) => { setMecanicoKey(Date.now()); form.setValue('mecanicoId', newItem.value, { shouldValidate: true }); }} />
              </div>
              <FormMessage>{form.formState.errors.mecanicoId?.message}</FormMessage>
            </FormItem>
        </div>
          <FormItem>
            <FormLabel>Fornecedor</FormLabel>
            <div className="flex items-center gap-2">
              <FormField control={form.control} name="fornecedorId" render={({ field }) => (<SearchCombobox key={fornecedorKey} collectionName="fornecedores" labelField={['razaoSocial', 'nomeFantasia']} searchField="razaoSocial" placeholder="Selecione o fornecedor" emptyMessage="Nenhum fornecedor encontrado." value={field.value} onChange={field.onChange} className="w-full" />)} />
              <QuickAddModal trigger={<Button type="button" size="icon" variant="outline"><PlusCircle className="h-4 w-4" /></Button>} title="Novo Fornecedor" description="Cadastre um novo fornecedor rapidamente." formComponent={FornecedorForm} formProps={{ isModal: true }} onSaveSuccess={(newItem) => { setFornecedorKey(Date.now()); form.setValue('fornecedorId', newItem.value, { shouldValidate: true }); }} />
            </div>
            <FormMessage>{form.formState.errors.fornecedorId?.message}</FormMessage>
        </FormItem>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="requisicaoVenda" render={({ field }) => (<FormItem><FormLabel>Requisição de Venda</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="requisicaoGarantia" render={({ field }) => (<FormItem><FormLabel>Requisição de Garantia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField control={form.control} name="nfSaida" render={({ field }) => (<FormItem><FormLabel>NF de Saída</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="nfCompra" render={({ field }) => (<FormItem><FormLabel>NF de Compra</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="valorPeca" render={({ field }) => (<FormItem><FormLabel>Valor da Peça (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>)} />
        </div>

        <FormField control={form.control} name="defeitoRelatado" render={({ field }) => (<FormItem><FormLabel>Defeito Relatado</FormLabel><FormControl><Textarea {...field} placeholder="Descreva detalhadamente o defeito apresentado pela peça..." /></FormControl><FormMessage /></FormItem>)} />
        
        {isEditMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="acaoRetorno" render={({ field }) => (
              <FormItem>
                <FormLabel>Ação do Retorno</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione a ação" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Aprovada">Aprovada</SelectItem>
                    <SelectItem value="Recusada">Recusada</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="nfRetorno" render={({ field }) => (<FormItem><FormLabel>NF de Retorno/Crédito</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          </div>
        )}

        <FormField control={form.control} name="observacao" render={({ field }) => (<FormItem><FormLabel>Observação</FormLabel><FormControl><Textarea {...field} placeholder="Observações adicionais..." /></FormControl><FormMessage /></FormItem>)} />
        
        <div className="flex justify-end gap-2 pt-4">
          {isModal && (<Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>)}
          <Button type="submit">{isEditMode ? 'Salvar Alterações' : 'Registrar Garantia'}</Button>
        </div>
      </form>
    </Form>
  );

  if (isModal) {
    return formContent;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? 'Editar Garantia' : 'Dados da Garantia'}</CardTitle>
        <CardDescription>{isEditMode ? 'Altere as informações necessárias.' : 'Informações sobre a peça, cliente, venda e defeito.'}</CardDescription>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
}

export default function GarantiaPageOrEdit() {
  const params = useParams();
  const router = useRouter();
  const movimentacaoId = params.id as string | undefined;
  
  const title = movimentacaoId ? "Editar Solicitação de Garantia" : "Registrar Solicitação de Garantia";
  const description = movimentacaoId ? "Altere os dados do registro de garantia." : "Preencha os detalhes para abrir uma nova solicitação de garantia.";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
      <GarantiaForm movimentacaoId={movimentacaoId} onCancel={() => router.back()} />
    </div>
  );
}
