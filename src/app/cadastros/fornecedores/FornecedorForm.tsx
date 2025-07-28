
'use client';

import * as React from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Fornecedor } from '@/types/firestore';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ComboboxOption } from '@/components/search-combobox';


const fornecedorSchema = z.object({
  razaoSocial: z.string().min(3, 'Razão Social é obrigatória.'),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().min(14, 'CNPJ inválido').max(18, 'CNPJ inválido'),
  status: z.enum(['Ativo', 'Inativo']).default('Ativo'),
  observacao: z.string().optional(),
}).passthrough();

type FornecedorFormValues = z.infer<typeof fornecedorSchema>;


interface FornecedorFormProps {
    isModal?: boolean;
    initialValues?: Fornecedor | null;
    onSaveSuccess?: (newItem: ComboboxOption) => void;
    onCancel?: () => void;
}

export function FornecedorForm({
    isModal = false,
    initialValues,
    onSaveSuccess,
    onCancel,
}: FornecedorFormProps) {
  const { toast } = useToast();
  const editingFornecedor = initialValues;

  const form = useForm<FornecedorFormValues>({
    resolver: zodResolver(fornecedorSchema),
    defaultValues: {
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      status: 'Ativo',
      observacao: '',
      ...initialValues,
    },
  });

  React.useEffect(() => {
    form.reset({
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      status: 'Ativo',
      observacao: '',
      ...initialValues,
    });
  }, [initialValues, form]);


  const handleFormSubmit = async (data: FornecedorFormValues) => {
    try {
      if (editingFornecedor) {
        const fornecedorDocRef = doc(db, 'fornecedores', editingFornecedor.id!);
        await updateDoc(fornecedorDocRef, data);
        toast({
          title: 'Sucesso!',
          description: 'Fornecedor atualizado com sucesso.',
        });
        if (onSaveSuccess) onSaveSuccess({ value: editingFornecedor.id!, label: `${data.razaoSocial} - (${data.nomeFantasia || ''})` });
      } else {
        const docRef = await addDoc(collection(db, 'fornecedores'), data);
        toast({
          title: 'Sucesso!',
          description: 'Fornecedor cadastrado com sucesso.',
        });
        if (onSaveSuccess) onSaveSuccess({ value: docRef.id, label: `${data.razaoSocial} - (${data.nomeFantasia || ''})` });
      }
    } catch (error) {
      console.error('Error saving fornecedor:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar os dados do fornecedor.',
        variant: 'destructive',
      });
    }
  };


  return (
    <div className={cn(!isModal && "space-y-6")}>
        <div className={cn(isModal && "p-0")}>
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

            <div className="flex justify-end gap-2 pt-4">
                {isModal && (
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancelar
                    </Button>
                )}
                <Button type="submit">
                {editingFornecedor ? 'Salvar Alterações' : 'Cadastrar'}
                </Button>
            </div>
            </form>
        </Form>
        </div>
    </div>
  );
}
