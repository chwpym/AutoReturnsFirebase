
'use client';

import * as React from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { EmpresaConfig } from '@/types/firestore';
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
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Cog, UploadCloud, Trash2 } from 'lucide-react';
import Image from 'next/image';

const empresaSchema = z.object({
  nome: z.string().min(3, 'Nome da Empresa é obrigatório.'),
  endereco: z.string().min(10, 'Endereço é obrigatório.'),
  telefone: z.string().min(10, 'Telefone é obrigatório.'),
  email: z.string().email('E-mail inválido.'),
  website: z.string().url('URL do website inválida.').optional().or(z.literal('')),
  cnpj: z.string().optional(),
  logoDataUrl: z.string().optional(),
});

type EmpresaFormValues = z.infer<typeof empresaSchema>;

const CONFIG_ID = 'dadosEmpresa';

export default function EmpresaConfigPage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<EmpresaFormValues>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      nome: '',
      endereco: '',
      telefone: '',
      email: '',
      website: '',
      cnpj: '',
      logoDataUrl: '',
    },
  });

  React.useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'configuracoes', CONFIG_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as EmpresaConfig;
          form.reset(data);
          if (data.logoDataUrl) {
            setLogoPreview(data.logoDataUrl);
          }
        }
      } catch (error) {
        console.error('Error fetching config:', error);
        toast({
          title: 'Erro ao carregar',
          description: 'Não foi possível buscar os dados da empresa.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [form, toast]);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
          toast({ title: 'Arquivo muito grande', description: 'O logo deve ter no máximo 2MB.', variant: 'destructive' });
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setLogoPreview(dataUrl);
        form.setValue('logoDataUrl', dataUrl, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (data: EmpresaFormValues) => {
    try {
      const docRef = doc(db, 'configuracoes', CONFIG_ID);
      await setDoc(docRef, data, { merge: true });
      toast({
        title: 'Sucesso!',
        description: 'Dados da empresa atualizados com sucesso.',
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar os dados da empresa.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Cog className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Configurações da Empresa
          </h1>
          <p className="text-muted-foreground">
            As informações aqui preenchidas serão usadas nos seus relatórios.
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados de Identificação</CardTitle>
          <CardDescription>
            Insira os dados que aparecerão no cabeçalho dos seus documentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-2">
                  <FormLabel>Logo da Empresa</FormLabel>
                   <div 
                        className="aspect-video w-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                    {logoPreview ? (
                        <div className="relative w-full h-full">
                            <Image src={logoPreview} alt="Preview do Logo" layout="fill" objectFit="contain" />
                             <Button 
                                type="button"
                                variant="destructive" 
                                size="icon" 
                                className="absolute top-2 right-2 h-7 w-7"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLogoPreview(null);
                                    form.setValue('logoDataUrl', '');
                                }}
                            >
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground p-4">
                           <UploadCloud className="mx-auto h-10 w-10 mb-2"/>
                           <span>Clique para carregar</span>
                           <p className="text-xs">PNG, JPG, SVG até 2MB</p>
                        </div>
                    )}
                  </div>
                  <Input 
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/png, image/jpeg, image/svg+xml"
                    onChange={handleLogoUpload}
                  />
                  <FormMessage>{form.formState.errors.logoDataUrl?.message}</FormMessage>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Nome da Empresa</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ (Opcional)</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="endereco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço Completo</FormLabel>
                    <FormControl><Input {...field} placeholder="Rua, Número, Bairro, Cidade - Estado, CEP"/></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail de Contato</FormLabel>
                      <FormControl><Input type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website (Opcional)</FormLabel>
                      <FormControl><Input {...field} placeholder="https://suaempresa.com.br"/></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
