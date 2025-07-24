
'use client';

import * as React from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Peca } from '@/types/firestore';
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


const pecaSchema = z.object({
  codigoPeca: z.string().min(1, 'Código da Peça é obrigatório.'),
  descricao: z.string().min(3, 'Descrição é obrigatória.'),
  status: z.enum(['Ativo', 'Inativo']).default('Ativo'),
  observacao: z.string().optional(),
}).passthrough();

type PecaFormValues = z.infer<typeof pecaSchema>;


interface PecaFormProps {
    isModal?: boolean;
    initialValues?: Partial<PecaFormValues> | null;
    onSaveSuccess?: (newItem: ComboboxOption) => void;
    onCancel?: () => void;
}

export function PecaForm({
    isModal = false,
    initialValues,
    onSaveSuccess,
    onCancel,
}: PecaFormProps) {
  const { toast } = useToast();
  const editingPeca = initialValues && 'id' in initialValues ? initialValues as Peca : null;

  const form = useForm<PecaFormValues>({
    resolver: zodResolver(pecaSchema),
    defaultValues: {
      codigoPeca: '',
      descricao: '',
      status: 'Ativo',
      observacao: '',
      ...initialValues,
    },
  });

  React.useEffect(() => {
    form.reset({
        codigoPeca: '',
        descricao: '',
        status: 'Ativo',
        observacao: '',
        ...initialValues,
    });
  }, [initialValues, form]);


  const handleFormSubmit = async (data: PecaFormValues) => {
    try {
      if (editingPeca) {
        const pecaDocRef = doc(db, 'pecas', editingPeca.id!);
        await updateDoc(pecaDocRef, data);
        toast({
          title: 'Sucesso!',
          description: 'Peça atualizada com sucesso.',
        });
        if (onSaveSuccess) onSaveSuccess({ value: editingPeca.id!, label: data.descricao });
      } else {
        const docRef = await addDoc(collection(db, 'pecas'), data);
        toast({
          title: 'Sucesso!',
          description: 'Peça cadastrada com sucesso.',
        });
        if (onSaveSuccess) onSaveSuccess({ value: docRef.id, label: data.descricao });
      }
    } catch (error) {
      console.error('Error saving peca:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar os dados da peça.',
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

            <div className="flex justify-end gap-2 pt-4">
                {isModal && (
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancelar
                    </Button>
                )}
                <Button type="submit">
                {editingPeca ? 'Salvar Alterações' : 'Cadastrar'}
                </Button>
            </div>
            </form>
        </Form>
        </div>
    </div>
  );
}
