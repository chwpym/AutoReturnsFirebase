
'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface SearchComboboxProps {
  collectionName: 'clientes' | 'fornecedores' | 'pecas';
  labelField: string; // The field to display in the dropdown (e.g., 'nomeRazaoSocial', 'descricao')
  searchField: string; // The field to order/search by (can be the same as labelField)
  filter?: {
    field: string;
    value: any;
  };
  placeholder: string;
  emptyMessage: string;
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}

export function SearchCombobox({
  collectionName,
  labelField,
  searchField,
  filter,
  placeholder,
  emptyMessage,
  value,
  onChange,
  className,
}: SearchComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<ComboboxOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  const fetchOptions = React.useCallback(async (search: string) => {
    setLoading(true);
    try {
      let q = query(
        collection(db, collectionName),
        where('status', '==', 'Ativo'),
        orderBy(searchField),
        limit(50)
      );

      // Simple text search (case-insensitive) - Firestore doesn't support this well without 3rd party tools
      // This will fetch and then filter locally. For larger datasets, a more robust search is needed.
      // For now, we fetch all active items up to a limit and let the CommandInput handle filtering.

      const querySnapshot = await getDocs(q);
      const fetchedOptions = querySnapshot.docs.map((doc) => ({
        value: doc.id,
        label: doc.data()[labelField],
      }));
      setOptions(fetchedOptions);
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
    } finally {
      setLoading(false);
    }
  }, [collectionName, labelField, searchField]);

  React.useEffect(() => {
    fetchOptions('');
  }, [fetchOptions]);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
        >
          {selectedOption?.label || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={placeholder} onValueChange={setSearchTerm} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {loading ? (
                <CommandItem disabled>Carregando...</CommandItem>
              ) : (
                options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label} // Command filters based on this value
                    onSelect={() => {
                      onChange(option.value === value ? null : option.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === option.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
