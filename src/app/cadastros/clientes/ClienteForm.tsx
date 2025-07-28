
'use client';

import * as React from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Cliente } from '@/types/firestore';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ComboboxOption } from '@/components/search-combobox';

const clienteSchema = z
  .object({
    nomeRazaoSocial: z.string().min(3, 'Nome/Razão Social é obrigatório.'),
    nomeFantasia: z.string().optional(),
    tipo: z
      .object({
        cliente: z.boolean().default(false),
        mecanico: z.boolean().default(false),
      })
      .refine((data) => data.cliente || data.mecanico, {
        message: 'Selecione pelo menos um tipo.',
      }),
    status: z.enum(['Ativo', 'Inativo']).default('Ativo'),
    observacao: z.string().optional(),
  })
  .passthrough();

type ClienteFormValues = z.infer<typeof clienteSchema>;

interface ClienteFormProps {
  isModal?: boolean;
  initialValues?: Cliente | null;
  onSaveSuccess?: (newItem: ComboboxOption) => void;
  onCancel?: () => void;
}

export function ClienteForm({
  isModal = false,
  initialValues,
  onSaveSuccess,
  onCancel,
}: ClienteFormProps) {
  const { toast } = useToast();
  const editingCliente = initialValues;

  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nomeRazaoSocial: '',
      nomeFantasia: '',
      tipo: { cliente: true, mecanico: false },
      status: 'Ativo',
      observacao: '',
      ...initialValues,
    },
  });

  React.useEffect(() => {
    form.reset({
      nomeRazaoSocial: '',
      nomeFantasia: '',
      tipo: { cliente: true, mecanico: false },
      status: 'Ativo',
      observacao: '',
      ...initialValues,
    });
  }, [initialValues, form]);


  const handleFormSubmit = async (data: ClienteFormValues) => {
    try {
      if (editingCliente) {
        const clienteDocRef = doc(db, 'clientes', editingCliente.id!);
        await updateDoc(clienteDocRef, data);
        toast({
          title: 'Sucesso!',
          description: 'Cliente atualizado com sucesso.',
        });
        if (onSaveSuccess) onSaveSuccess({ value: editingCliente.id!, label: data.nomeRazaoSocial });
      } else {
        const docRef = await addDoc(collection(db, 'clientes'), data);
        toast({
          title: 'Sucesso!',
          description: 'Cliente cadastrado com sucesso.',
        });
         if (onSaveSuccess) onSaveSuccess({ value: docRef.id, label: data.nomeRazaoSocial });
      }
    } catch (error) {
      console.error('Error saving cliente:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar os dados do cliente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={cn(!isModal && "space-y-6")}>
      <div className={cn(isModal && "border-0 shadow-none")}>
        <div className={cn(isModal && "p-0")}>
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

              <div className="flex justify-end gap-2 pt-4">
                {isModal && (
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancelar
                  </Button>
                )}
                <Button type="submit">
                  {editingCliente ? 'Salvar Alterações' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
